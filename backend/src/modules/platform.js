import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import rateLimit from 'express-rate-limit';
import prisma from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateToken, requireRole, jwtSecret } from '../middleware/auth.js';
import { getAvailableSlots } from '../utils/availability.js';
import { presentTestResult, resolveBiomarker } from './tests/service/index.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.', errors: [] } });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const roles = ['ADMIN', 'DOCTOR', 'PATIENT'];
const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, patient: user.patient, doctor: user.doctor });
const session = (user) => ({ token: jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '8h' }), user: publicUser(user) });
const audit = (userId, action, entityType, entityId, details) => prisma.auditLog.create({ data: { userId, action, entityType, entityId, details } });
const notify = (userId, title, message) => prisma.notification.create({ data: { userId, title, message } });
const profileInclude = { patient: true, doctor: { include: { department: true, availability: { where: { active: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } } } };
const getPatientId = (user) => user.role === 'PATIENT' ? user.patient?.id : null;
const getDoctorId = (user) => user.role === 'DOCTOR' ? user.doctor?.id : null;
const doctorPatientWhere = (doctorId) => ({ OR: [
  { doctorId },
  { appointments: { some: { doctorId, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED'] } } } },
] });
const doctorCanAccessPatient = async (patientId, doctorId) => Boolean(await prisma.patient.findFirst({ where: { id: patientId, ...doctorPatientWhere(doctorId) }, select: { id: true } }));

router.post('/auth/register', authLimiter, wrap(async (req, res) => {
  // Blank optional fields (for example an empty phone number) are treated as "not provided".
  const clean = Object.fromEntries(Object.entries(req.body || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  const input = z.object({
    name: z.string({ required_error: 'Please enter your full name' }).trim().min(2, 'Please enter your full name').max(100, 'Name is too long'),
    email: z.string({ required_error: 'Please enter your email address' }).trim().email('Please enter a valid email address').max(200, 'Email is too long'),
    password: z.string({ required_error: 'Please enter a password' }).min(8, 'Password must be at least 8 characters').max(100, 'Password is too long'),
    role: z.enum(['PATIENT', 'DOCTOR']).default('PATIENT'),
    phone: z.string().trim().max(30, 'Phone number is too long').optional(),
    age: z.coerce.number({ invalid_type_error: 'Please enter a valid age' }).int('Please enter a valid age').min(0, 'Please enter a valid age').max(120, 'Please enter a valid age').optional(),
    gender: z.enum(['Male', 'Female', 'Other'], { errorMap: () => ({ message: 'Please choose a gender' }) }).optional(),
    specialization: z.string().trim().min(2, 'Please enter your specialty').max(100, 'Specialty is too long').optional(),
    qualifications: z.string().trim().max(200, 'Qualifications are too long').optional(),
    experienceYears: z.coerce.number({ invalid_type_error: 'Please enter years of experience' }).int('Please enter years of experience').min(0, 'Please enter years of experience').max(80, 'Please enter years of experience').optional(),
    licenseNumber: z.string().trim().min(3, 'Please enter your registration number').max(80, 'Registration number is too long').optional(),
    city: z.string().trim().max(100, 'City name is too long').optional(),
  }).parse(clean);
  if (input.role === 'PATIENT' && (input.age === undefined || !input.gender)) throw new AppError('Please enter your age and gender', 400);
  if (input.role === 'DOCTOR' && (!input.specialization || !input.qualifications || input.experienceYears === undefined || !input.licenseNumber)) throw new AppError('Please fill in specialty, qualifications, experience and registration number', 400);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = input.role === 'PATIENT'
    ? await prisma.user.create({ data: {
      name: input.name, email: input.email.toLowerCase(), passwordHash, role: 'PATIENT',
      patient: { create: { patientId: `P-${Date.now().toString(36).toUpperCase()}`, name: input.name, age: input.age, gender: input.gender, phone: input.phone } },
    }, include: profileInclude })
    : await prisma.user.create({ data: {
      name: input.name, email: input.email.toLowerCase(), passwordHash, role: 'DOCTOR',
      doctor: { create: {
        specialization: input.specialization, qualifications: input.qualifications,
        experienceYears: input.experienceYears, licenseNumber: input.licenseNumber,
        city: input.city, location: input.city, status: 'PENDING', approved: false,
      } },
    }, include: profileInclude });
  await audit(user.id, 'REGISTER', 'User', user.id, `${input.role} account created`);
  if (input.role === 'DOCTOR') {
    await Promise.all((await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } })).map((admin) => notify(admin.id, 'Doctor registration', `${user.name} submitted a doctor profile for review.`)));
    return res.status(201).json({ success: true, data: { pendingApproval: true, user: publicUser(user) } });
  }
  res.status(201).json({ success: true, data: session(user) });
}));

router.post('/auth/login', authLimiter, wrap(async (req, res) => {
  const input = z.object({ email: z.string({ required_error: 'Please enter your email address' }).trim().email('Please enter a valid email address'), password: z.string({ required_error: 'Please enter your password' }).min(1, 'Please enter your password'), role: z.enum(roles).optional() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() }, include: profileInclude });
  if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(input.password, user.passwordHash)) || (input.role && input.role !== user.role)) throw new AppError('Email or password is incorrect', 401);
  if (user.role === 'DOCTOR' && !user.doctor?.approved) throw new AppError('Your doctor account is waiting for admin approval', 403);
  await audit(user.id, 'LOGIN', 'User', user.id, 'Signed in');
  res.json({ success: true, data: session(user) });
}));

router.get('/auth/me', authenticateToken, (req, res) => res.json({ success: true, data: publicUser(req.user) }));

router.use(authenticateToken);

router.post('/auth/logout', wrap(async (req, res) => {
  await audit(req.user.id, 'LOGOUT', 'User', req.user.id, 'Signed out');
  res.json({ success: true, data: { loggedOut: true } });
}));

router.patch('/profile', requireRole('PATIENT'), wrap(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().max(200).optional(),
    age: z.number().int().min(0).max(120).optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    medicalHistory: z.string().trim().max(5000).nullable().optional(),
  }).refine((value) => Object.keys(value).length > 0, 'Enter at least one profile change').parse(req.body);
  const { name, email, age, gender, medicalHistory } = input;
  await prisma.$transaction([
    prisma.user.update({ where: { id: req.user.id }, data: { ...(name ? { name } : {}), ...(email ? { email: email.toLowerCase() } : {}) } }),
    prisma.patient.update({ where: { id: getPatientId(req.user) }, data: { ...(name ? { name } : {}), ...(age !== undefined ? { age } : {}), ...(gender ? { gender } : {}), ...(medicalHistory !== undefined ? { medicalHistory } : {}) } }),
  ]);
  const updated = await prisma.user.findUnique({ where: { id: req.user.id }, include: profileInclude });
  await audit(req.user.id, 'UPDATE_PROFILE', 'Patient', updated.patient.id, 'Patient profile updated');
  res.json({ success: true, data: publicUser(updated) });
}));

router.patch('/doctor/profile', requireRole('DOCTOR'), wrap(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100).optional(), specialization: z.string().trim().min(2).max(100).optional(),
    qualifications: z.string().trim().max(200).optional(), experienceYears: z.number().int().min(0).max(80).optional(),
    languages: z.string().trim().max(200).optional(), clinicName: z.string().trim().max(150).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(), consultationFee: z.number().finite().min(0).max(100000).optional(),
    bio: z.string().max(2000).nullable().optional(), avatarUrl: z.string().url().nullable().optional(),
  }).refine((value) => Object.keys(value).length > 0, 'Enter at least one profile change').parse(req.body);
  const { name, avatarUrl, ...doctorFields } = input;
  const doctorId = getDoctorId(req.user);
  if (Object.keys(doctorFields).length) await prisma.doctor.update({ where: { id: doctorId }, data: doctorFields });
  if (name || avatarUrl !== undefined) await prisma.user.update({ where: { id: req.user.id }, data: { ...(name ? { name } : {}), ...(avatarUrl !== undefined ? { avatarUrl } : {}) } });
  const updated = await prisma.user.findUnique({ where: { id: req.user.id }, include: profileInclude });
  await audit(req.user.id, 'UPDATE_PROFILE', 'Doctor', doctorId, JSON.stringify(input));
  res.json({ success: true, data: publicUser(updated) });
}));

router.get('/dashboard', wrap(async (req, res) => {
  const user = req.user;
  if (user.role === 'PATIENT') {
    const patientId = getPatientId(user);
    const [appointments, latestTests, prescriptions, reports, notifications] = await Promise.all([
      prisma.appointment.findMany({ where: { patientId, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] } }, orderBy: { startAt: 'asc' }, take: 3, include: { doctor: { include: { user: true, department: true } } } }),
      prisma.testResult.findMany({ where: { patientId }, orderBy: { testDate: 'desc' }, take: 8, include: { biomarker: true } }),
      prisma.prescription.count({ where: { patientId, status: 'ACTIVE' } }),
      prisma.report.count({ where: { patientId, status: 'PUBLISHED' } }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    return res.json({ success: true, data: { appointments, latestTests: latestTests.map(presentTestResult), prescriptions, reports, unreadNotifications: notifications } });
  }
  if (user.role === 'DOCTOR') {
    const doctorId = user.doctor.id;
    const [todayAppointments, pendingAppointments, patientCount] = await Promise.all([
      prisma.appointment.findMany({ where: { doctorId, startAt: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(24,0,0,0)) } }, orderBy: { startAt: 'asc' }, include: { patient: true } }),
      prisma.appointment.count({ where: { doctorId, status: 'PENDING' } }),
      prisma.patient.count({ where: { doctorId } }),
    ]);
    return res.json({ success: true, data: { todayAppointments, pendingAppointments, patientCount } });
  }
  const [patients, doctors, appointments, reports, pendingDoctors] = await Promise.all([
    prisma.patient.count(), prisma.doctor.count(), prisma.appointment.count(), prisma.report.count(), prisma.doctor.count({ where: { approved: false } }),
  ]);
  const [recentAppointments, specialties, recentActivity] = await Promise.all([
    prisma.appointment.findMany({ where: { startAt: { gte: new Date(Date.now() - 13 * 86400000) } }, select: { startAt: true } }),
    prisma.doctor.groupBy({ by: ['specialization'], _count: { _all: true }, orderBy: { _count: { specialization: 'desc' } } }),
    prisma.auditLog.findMany({ include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 8 }),
  ]);
  const appointmentsPerDay = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (13 - index));
    const key = day.toISOString().slice(0, 10);
    return { date: key, count: recentAppointments.filter((appointment) => appointment.startAt.toISOString().slice(0, 10) === key).length };
  });
  res.json({ success: true, data: { patients, doctors, appointments, reports, pendingDoctors, appointmentsPerDay, specialties, recentActivity } });
}));

router.get('/doctors', wrap(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const numericFilter = (name) => {
    if (req.query[name] === undefined) return undefined;
    const value = Number(req.query[name]);
    if (!Number.isFinite(value) || value < 0) throw new AppError(`${name} must be a non-negative number`, 400);
    return value;
  };
  const feeMin = numericFilter('feeMin'); const feeMax = numericFilter('feeMax');
  const experienceMin = numericFilter('experienceMin');
  const availableDay = req.query.available === 'today' ? new Date().getDay() : req.query.available === 'tomorrow' ? (new Date().getDay() + 1) % 7 : undefined;
  const where = {
    approved: true, active: true, user: { status: 'ACTIVE' },
    ...(req.query.specialization ? { specialization: { contains: String(req.query.specialization) } } : {}),
    ...(req.query.city ? { city: { contains: String(req.query.city) } } : {}),
    ...(req.query.gender ? { gender: String(req.query.gender) } : {}),
    ...(req.query.language ? { languages: { contains: String(req.query.language) } } : {}),
    ...(experienceMin !== undefined ? { experienceYears: { gte: experienceMin } } : {}),
    ...((feeMin !== undefined || feeMax !== undefined) ? { consultationFee: { ...(feeMin !== undefined ? { gte: feeMin } : {}), ...(feeMax !== undefined ? { lte: feeMax } : {}) } } : {}),
    ...(availableDay !== undefined ? { availability: { some: { active: true, dayOfWeek: availableDay } } } : {}),
    ...(search ? { OR: [{ specialization: { contains: search } }, { location: { contains: search } }, { city: { contains: search } }, { user: { name: { contains: search } } }, { department: { name: { contains: search } } }] } : {}),
  };
  const orderBy = req.query.sort === 'fee' ? { consultationFee: 'asc' }
    : req.query.sort === 'experience' ? { experienceYears: 'desc' }
      : req.query.sort === 'rating' ? { ratingAvg: 'desc' } : { user: { name: 'asc' } };
  const doctors = await prisma.doctor.findMany({ where, include: {
    user: { select: { name: true, avatarUrl: true } }, department: true,
    availability: { where: { active: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    _count: { select: { reviews: true } },
  }, orderBy });
  res.json({ success: true, data: doctors });
}));

router.get('/doctors/:id/slots', wrap(async (req, res) => {
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
  const slots = await getAvailableSlots(req.params.id, date);
  if (!slots.length && !await prisma.doctor.findFirst({ where: { id: req.params.id, approved: true, active: true } })) throw new AppError('Doctor not found', 404);
  res.json({ success: true, data: slots });
}));

router.get('/doctors/:id', wrap(async (req, res) => {
  const doctor = await prisma.doctor.findFirst({ where: { id: req.params.id, approved: true, active: true, user: { status: 'ACTIVE' } }, include: {
    user: { select: { name: true, avatarUrl: true } }, department: true,
    availability: { where: { active: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
    reviews: { include: { patient: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
    _count: { select: { reviews: true } },
  } });
  if (!doctor || !doctor.approved || !doctor.active || !doctor.user) throw new AppError('Doctor not found', 404);
  res.json({ success: true, data: doctor });
}));

router.get('/appointments', wrap(async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : req.user.role === 'DOCTOR' ? { doctorId: getDoctorId(req.user) } : { patientId: getPatientId(req.user) };
  if (req.user.role === 'ADMIN') {
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.doctorId) where.doctorId = String(req.query.doctorId);
    if (req.query.patientId) where.patientId = String(req.query.patientId);
    if (req.query.date) {
      const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
      where.startAt = { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) };
    }
  }
  const appointments = await prisma.appointment.findMany({ where, include: { patient: true, doctor: { include: { user: { select: { name: true } }, department: true } } }, orderBy: { startAt: 'desc' } });
  res.json({ success: true, data: appointments });
}));

router.post('/appointments', requireRole('PATIENT', 'ADMIN'), wrap(async (req, res) => {
  const input = z.object({ doctorId: z.string(), patientId: z.string().optional(), startAt: z.string().datetime(), reason: z.string().trim().max(500).optional() }).parse(req.body);
  const patientId = req.user.role === 'ADMIN' ? input.patientId : getPatientId(req.user);
  if (!patientId) throw new AppError('Choose a patient for this appointment', 400);
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, include: { user: true } });
  if (!patient) throw new AppError('Patient not found', 404);
  const startAt = new Date(input.startAt);
  const doctor = await prisma.doctor.findFirst({ where: { id: input.doctorId, approved: true, active: true }, include: { user: true } });
  if (!doctor) throw new AppError('Doctor is unavailable', 404);
  const localDateParts = new Intl.DateTimeFormat('en-CA', { timeZone: doctor.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(startAt).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
  const localDate = `${localDateParts.year}-${localDateParts.month}-${localDateParts.day}`;
  const slot = (await getAvailableSlots(doctor.id, localDate)).find((candidate) => new Date(candidate.startAt).getTime() === startAt.getTime() && candidate.available);
  if (!slot) throw new AppError('That time is unavailable. Choose an open slot from the schedule.', 409);
  const endAt = new Date(slot.endAt);
  const appointment = await prisma.$transaction(async (tx) => {
    const conflict = await tx.appointment.findFirst({ where: { doctorId: doctor.id, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] }, startAt: { lt: endAt }, endAt: { gt: startAt } }, select: { id: true } });
    if (conflict) throw new AppError('That time was just booked. Choose another open slot.', 409);
    return tx.appointment.create({ data: { patientId, doctorId: doctor.id, startAt, endAt, reason: input.reason }, include: { doctor: { include: { user: { select: { name: true } } } }, patient: true } });
  });
  await Promise.all([notify(doctor.userId, 'Appointment request', `${patient.name} requested an appointment.`), patient.userId ? notify(patient.userId, 'Appointment request sent', `Your appointment request was sent to ${doctor.user.name}.`) : Promise.resolve(), audit(req.user.id, 'BOOK', 'Appointment', appointment.id, `Doctor ${doctor.id}`)]);
  res.status(201).json({ success: true, data: appointment });
}));

router.patch('/appointments/:id/status', requireRole('DOCTOR', 'ADMIN'), wrap(async (req, res) => {
  const status = z.enum(['CONFIRMED', 'REJECTED', 'COMPLETED', 'CANCELLED']).parse(req.body.status);
  const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id }, include: { patient: { include: { user: true } }, doctor: true } });
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (req.user.role === 'DOCTOR' && appointment.doctorId !== getDoctorId(req.user)) throw new AppError('You can only manage your own appointments', 403);
  const allowedTransitions = {
    PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    RESCHEDULED: ['CONFIRMED', 'COMPLETED', 'CANCELLED'],
  };
  if (!(allowedTransitions[appointment.status] || []).includes(status)) throw new AppError(`Cannot move an appointment from ${appointment.status} to ${status}`, 409);
  const updated = await prisma.appointment.update({ where: { id: appointment.id }, data: { status }, include: { patient: { include: { user: true } }, doctor: { include: { user: true } } } });
  if (appointment.patient.userId) await notify(appointment.patient.userId, 'Appointment updated', `Your appointment status is now ${status.toLowerCase()}.`);
  if (req.user.role === 'ADMIN') await notify(appointment.doctor.userId, 'Appointment updated', `An administrator changed the appointment to ${status.toLowerCase()}.`);
  await audit(req.user.id, 'UPDATE_STATUS', 'Appointment', appointment.id, status);
  res.json({ success: true, data: updated });
}));

router.patch('/appointments/:id/cancel', wrap(async (req, res) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id }, include: { patient: { include: { user: true } }, doctor: { include: { user: true } } } });
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (req.user.role === 'PATIENT' && appointment.patientId !== getPatientId(req.user)) throw new AppError('You can only cancel your own appointments', 403);
  if (req.user.role === 'DOCTOR' && appointment.doctorId !== getDoctorId(req.user)) throw new AppError('You can only cancel your own appointments', 403);
  if (!['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status)) throw new AppError('This appointment can no longer be cancelled', 409);
  const updated = await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'CANCELLED', cancelledBy: req.user.role } });
  if (req.user.role !== 'PATIENT' && appointment.patient.userId) await notify(appointment.patient.userId, 'Appointment cancelled', 'Your appointment was cancelled by your care team.');
  if (req.user.role !== 'DOCTOR') await notify(appointment.doctor.userId, 'Appointment cancelled', 'An appointment on your schedule was cancelled.');
  await audit(req.user.id, 'CANCEL', 'Appointment', appointment.id, 'Cancelled');
  res.json({ success: true, data: updated });
}));

router.patch('/appointments/:id/reschedule', wrap(async (req, res) => {
  const input = z.object({ startAt: z.string().datetime() }).parse(req.body);
  const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id }, include: { patient: { include: { user: true } }, doctor: { include: { user: true } } } });
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (req.user.role === 'DOCTOR' && appointment.doctorId !== getDoctorId(req.user)) throw new AppError('You can only manage your own appointments', 403);
  if (req.user.role === 'PATIENT' && appointment.patientId !== getPatientId(req.user)) throw new AppError('You can only reschedule your own appointments', 403);
  if (!['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status)) throw new AppError('This appointment can no longer be rescheduled', 409);
  const startAt = new Date(input.startAt);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: appointment.doctor.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(startAt).reduce((values, part) => ({ ...values, [part.type]: part.value }), {});
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const slot = (await getAvailableSlots(appointment.doctorId, localDate, appointment.id)).find((candidate) => new Date(candidate.startAt).getTime() === startAt.getTime() && candidate.available);
  if (!slot) throw new AppError('That time is unavailable. Choose an open slot from the schedule.', 409);
  const endAt = new Date(slot.endAt);
  const updated = await prisma.$transaction(async (tx) => {
    const conflict = await tx.appointment.findFirst({ where: { id: { not: appointment.id }, doctorId: appointment.doctorId, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] }, startAt: { lt: endAt }, endAt: { gt: startAt } }, select: { id: true } });
    if (conflict) throw new AppError('That time was just booked. Choose another open slot.', 409);
    return tx.appointment.update({ where: { id: appointment.id }, data: { startAt, endAt, status: 'RESCHEDULED' } });
  });
  if (appointment.patient.userId) await notify(appointment.patient.userId, 'Appointment rescheduled', `Your visit was moved to ${startAt.toLocaleString()}.`);
  if (req.user.role === 'PATIENT' || req.user.role === 'ADMIN') await notify(appointment.doctor.userId, 'Appointment rescheduled', 'An appointment on your schedule was moved to a new time.');
  await audit(req.user.id, 'RESCHEDULE', 'Appointment', appointment.id, startAt.toISOString());
  res.json({ success: true, data: updated });
}));

router.get('/records', wrap(async (req, res) => {
  const patientId = req.user.role === 'ADMIN' ? (req.query.patientId || undefined) : req.user.role === 'DOCTOR' ? undefined : getPatientId(req.user);
  let patientWhere = patientId ? { patientId } : {};
  if (req.user.role === 'DOCTOR') patientWhere = { patient: doctorPatientWhere(getDoctorId(req.user)) };
  const [prescriptions, reports, history, results] = await Promise.all([
    prisma.prescription.findMany({ where: patientWhere, include: { doctor: { include: { user: { select: { name: true } } } }, patient: { select: { name: true, patientId: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.report.findMany({ where: { ...patientWhere, ...(req.user.role === 'PATIENT' ? { status: 'PUBLISHED' } : {}) }, include: { doctor: { include: { user: { select: { name: true } } } }, patient: { select: { name: true, patientId: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.medicalHistory.findMany({ where: patientWhere, orderBy: { occurredAt: 'desc' } }),
    prisma.testResult.findMany({ where: patientWhere, orderBy: { testDate: 'desc' }, take: 100, include: { biomarker: true } }),
  ]);
  res.json({ success: true, data: { prescriptions, reports, history, results: results.map(presentTestResult) } });
}));

router.get('/patients/:id/results', wrap(async (req, res) => {
  const allowed = req.user.role === 'ADMIN'
    || (req.user.role === 'PATIENT' && getPatientId(req.user) === req.params.id)
    || (req.user.role === 'DOCTOR' && await doctorCanAccessPatient(req.params.id, getDoctorId(req.user)));
  if (!allowed) throw new AppError('You cannot access this patient record', 403);
  const data = await prisma.testResult.findMany({ where: { patientId: req.params.id }, orderBy: { testDate: 'desc' }, include: { biomarker: true } });
  res.json({ success: true, data: data.map(presentTestResult) });
}));
router.post('/patients/:id/results', requireRole('DOCTOR', 'ADMIN'), wrap(async (req, res) => {
  const input = z.object({ biomarkerName: z.string().trim().min(1).max(100), value: z.number().finite(), unit: z.string().trim().min(1).max(30), testDate: z.string().datetime(), notes: z.string().max(1000).optional() }).parse(req.body);
  if (new Date(input.testDate) > new Date()) throw new AppError('Test date cannot be in the future', 400);
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!patient) throw new AppError('Patient not found', 404);
  if (req.user.role === 'DOCTOR' && !await doctorCanAccessPatient(patient.id, getDoctorId(req.user))) throw new AppError('Patient is not assigned to you', 403);
  const biomarker = await resolveBiomarker(input.biomarkerName, input.unit);
  const result = await prisma.testResult.create({ data: {
    biomarkerId: biomarker.id, value: input.value, unit: input.unit,
    testDate: new Date(input.testDate), patientId: patient.id, doctorId: getDoctorId(req.user),
    enteredById: req.user.id, remarks: input.notes,
  }, include: { biomarker: true } });
  await audit(req.user.id, 'CREATE', 'TestResult', String(result.id), biomarker.name);
  res.status(201).json({ success: true, data: presentTestResult(result) });
}));
router.delete('/tests/:id', requireRole('DOCTOR', 'ADMIN'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError('Invalid test result id', 400);
  const result = await prisma.testResult.findUnique({ where: { id }, include: { biomarker: true } });
  if (!result) throw new AppError('Test result not found', 404);
  if (req.user.role === 'DOCTOR' && result.doctorId !== getDoctorId(req.user)) throw new AppError('You can only remove results you recorded', 403);
  await prisma.testResult.delete({ where: { id } });
  await audit(req.user.id, 'DELETE', 'TestResult', String(id), result.biomarker.name);
  res.json({ success: true, data: null });
}));

router.post('/prescriptions', requireRole('DOCTOR'), wrap(async (req, res) => {
  const input = z.object({ patientId: z.string(), medication: z.string().trim().min(1).max(150), dosage: z.string().trim().min(1).max(100), frequency: z.string().trim().min(1).max(100), instructions: z.string().max(1000).optional(), endDate: z.string().datetime().optional() }).parse(req.body);
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, ...doctorPatientWhere(getDoctorId(req.user)) }, include: { user: true } });
  if (!patient) throw new AppError('Patient is not assigned to you', 403);
  const prescription = await prisma.prescription.create({ data: { ...input, endDate: input.endDate ? new Date(input.endDate) : null, doctorId: getDoctorId(req.user) } });
  if (patient.userId) await notify(patient.userId, 'New prescription', 'Your doctor added a prescription to your records.');
  await audit(req.user.id, 'CREATE', 'Prescription', prescription.id, input.medication);
  res.status(201).json({ success: true, data: prescription });
}));

router.post('/reports', requireRole('DOCTOR'), wrap(async (req, res) => {
  const input = z.object({ patientId: z.string(), title: z.string().trim().min(1).max(150), summary: z.string().trim().min(1).max(1000), content: z.string().max(10000).optional(), doctorNotes: z.string().max(10000).optional() }).parse(req.body);
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, ...doctorPatientWhere(getDoctorId(req.user)) }, include: { user: true } });
  if (!patient) throw new AppError('Patient is not assigned to you', 403);
  const report = await prisma.report.create({ data: { ...input, doctorId: getDoctorId(req.user), status: 'DRAFT', published: false } });
  await audit(req.user.id, 'CREATE', 'Report', report.id, report.title);
  res.status(201).json({ success: true, data: report });
}));

router.put('/reports/:id', requireRole('DOCTOR'), wrap(async (req, res) => {
  const input = z.object({ title: z.string().trim().min(1).max(150).optional(), summary: z.string().trim().min(1).max(1000).optional(), content: z.string().max(10000).nullable().optional(), doctorNotes: z.string().max(10000).nullable().optional() }).refine((value) => Object.keys(value).length > 0, 'Enter at least one report change').parse(req.body);
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report || report.doctorId !== getDoctorId(req.user)) throw new AppError('Report not found', 404);
  if (report.status !== 'DRAFT') throw new AppError('Published reports cannot be edited', 409);
  const updated = await prisma.report.update({ where: { id: report.id }, data: input });
  await audit(req.user.id, 'UPDATE', 'Report', report.id, JSON.stringify({ before: { title: report.title, summary: report.summary }, after: input }));
  res.json({ success: true, data: updated });
}));

router.patch('/reports/:id/publish', requireRole('DOCTOR', 'ADMIN'), wrap(async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id }, include: { patient: true } });
  if (!report || (req.user.role === 'DOCTOR' && report.doctorId !== getDoctorId(req.user))) throw new AppError('Report not found', 404);
  if (report.status === 'PUBLISHED') throw new AppError('Report is already published', 409);
  if (!report.summary.trim()) throw new AppError('Add a summary before publishing', 400);
  const updated = await prisma.report.update({ where: { id: report.id }, data: { status: 'PUBLISHED', published: true, publishedAt: new Date() } });
  if (report.patient.userId) await notify(report.patient.userId, 'New medical report', 'Your doctor published a report to your records.');
  await audit(req.user.id, 'PUBLISH', 'Report', report.id, report.title);
  res.json({ success: true, data: updated });
}));

router.post('/medical-history', requireRole('DOCTOR'), wrap(async (req, res) => {
  const input = z.object({ patientId: z.string(), title: z.string().trim().min(1).max(150), details: z.string().trim().min(1).max(3000), occurredAt: z.string().datetime().optional() }).parse(req.body);
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, ...doctorPatientWhere(getDoctorId(req.user)) } });
  if (!patient) throw new AppError('Patient is not assigned to you', 403);
  const entry = await prisma.medicalHistory.create({ data: { ...input, occurredAt: input.occurredAt ? new Date(input.occurredAt) : null, doctorId: getDoctorId(req.user) } });
  await audit(req.user.id, 'CREATE', 'MedicalHistory', entry.id, entry.title);
  res.status(201).json({ success: true, data: entry });
}));

router.put('/availability', requireRole('DOCTOR'), wrap(async (req, res) => {
  const slots = z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) })).max(21).parse(req.body.slots);
  if (slots.some((slot) => slot.startTime >= slot.endTime)) throw new AppError('Availability end time must be later than start time', 400);
  const doctorId = getDoctorId(req.user);
  const data = await prisma.$transaction(async (tx) => {
    await tx.doctorAvailability.deleteMany({ where: { doctorId } });
    for (const slot of slots) await tx.doctorAvailability.create({ data: { ...slot, doctorId } });
    return tx.doctorAvailability.findMany({ where: { doctorId }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
  });
  await audit(req.user.id, 'UPDATE', 'DoctorAvailability', doctorId, `${slots.length} weekly slots`);
  res.json({ success: true, data });
}));

router.get('/reports/:id/pdf', wrap(async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id }, include: { patient: true, doctor: { include: { user: true } } } });
  if (!report) throw new AppError('Report not found', 404);
  const allowed = req.user.role === 'ADMIN'
    || (req.user.role === 'PATIENT' && report.patientId === getPatientId(req.user) && report.status === 'PUBLISHED')
    || (req.user.role === 'DOCTOR' && report.doctorId === getDoctorId(req.user));
  if (!allowed) throw new AppError('You cannot access this report', 403);
  const [results, history] = await Promise.all([
    prisma.testResult.findMany({ where: { patientId: report.patientId }, include: { biomarker: true }, orderBy: { testDate: 'desc' }, take: 12 }),
    prisma.medicalHistory.findMany({ where: { patientId: report.patientId }, orderBy: { occurredAt: 'desc' }, take: 10 }),
  ]);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="mrx-report-${report.id}.pdf"`);
  const pdf = new PDFDocument({ margin: 54, info: { Title: report.title, Author: 'MRX HealthTECH' } });
  pdf.pipe(res);
  pdf.fillColor('#0f766e').fontSize(11).text('MRX HEALTHTECH  |  CLINICAL REPORT');
  pdf.moveDown().fillColor('#0f172a').fontSize(23).text(report.title);
  pdf.moveDown().fontSize(10).fillColor('#64748b').text(`Patient: ${report.patient.name} (${report.patient.patientId})`);
  pdf.text(`Age / gender: ${report.patient.age} / ${report.patient.gender}${report.patient.bloodGroup ? ` | ${report.patient.bloodGroup}` : ''}`);
  if (report.patient.allergies) pdf.text(`Allergies: ${report.patient.allergies}`);
  pdf.text(`Doctor: ${report.doctor.user.name}`);
  pdf.text(`Date: ${report.createdAt.toLocaleDateString()}`);
  if (history.length) {
    pdf.moveDown().fillColor('#0f172a').fontSize(15).text('Medical history');
    history.forEach((entry) => pdf.moveDown(0.3).fontSize(10).fillColor('#334155').text(`${entry.title}: ${entry.details}`));
  }
  if (results.length) {
    if (pdf.y > 620) pdf.addPage();
    pdf.moveDown().fillColor('#0f172a').fontSize(15).text('Recent test results');
    pdf.moveDown(0.5).fontSize(9).fillColor('#475569').text('Biomarker                         Value                     Date', { continued: false });
    results.slice(0, 8).forEach((result) => pdf.moveDown(0.25).fontSize(9).fillColor('#334155').text(`${result.biomarker.name}                         ${result.value} ${result.unit}                     ${result.testDate.toLocaleDateString()}`));
    const trend = [...results].filter((item) => item.biomarker.name === results[0].biomarker.name).sort((a, b) => a.testDate - b.testDate);
    if (trend.length > 1) {
      if (pdf.y > 650) pdf.addPage();
      pdf.moveDown().fontSize(11).fillColor('#0f172a').text(`${trend[0].biomarker.name} trend`);
      const chart = { x: 62, y: pdf.y + 12, width: 460, height: 82 };
      const values = trend.map((item) => item.value); const min = Math.min(...values); const max = Math.max(...values) || min + 1;
      pdf.save().strokeColor('#dbe8e6').lineWidth(1).moveTo(chart.x, chart.y + chart.height).lineTo(chart.x + chart.width, chart.y + chart.height).stroke();
      trend.forEach((point, index) => {
        const x = chart.x + (chart.width * index) / (trend.length - 1);
        const y = chart.y + chart.height - ((point.value - min) / (max - min || 1)) * chart.height;
        if (index) {
          const prior = trend[index - 1];
          const priorY = chart.y + chart.height - ((prior.value - min) / (max - min || 1)) * chart.height;
          const priorX = chart.x + (chart.width * (index - 1)) / (trend.length - 1);
          pdf.strokeColor('#0d9488').lineWidth(2).moveTo(priorX, priorY).lineTo(x, y).stroke();
        }
        pdf.fillColor('#0d9488').circle(x, y, 3).fill();
      });
      pdf.restore().y = chart.y + chart.height + 14;
    }
  }
  pdf.moveDown().fillColor('#0f172a').fontSize(15).text('Summary');
  pdf.moveDown(0.4).fontSize(11).text(report.summary, { lineGap: 4 });
  if (report.content) { pdf.moveDown().fontSize(15).text('Observations'); pdf.moveDown(0.4).fontSize(11).text(report.content, { lineGap: 4 }); }
  if (report.doctorNotes) { pdf.moveDown().fontSize(15).text('Doctor notes'); pdf.moveDown(0.4).fontSize(11).text(report.doctorNotes, { lineGap: 4 }); }
  pdf.moveDown().fontSize(9).fillColor('#64748b').text('This report contains doctor-entered information. It does not provide an automated diagnosis.');
  pdf.end();
}));

router.get('/notifications', wrap(async (req, res) => {
  const data = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, data });
}));
router.patch('/notifications/:id/read', wrap(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { isRead: true, readAt: new Date() } });
  if (!result.count) throw new AppError('Notification not found', 404);
  res.json({ success: true, data: { read: true } });
}));
router.patch('/notifications/read-all', wrap(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
  res.json({ success: true, data: { count: result.count } });
}));

router.get('/favorites', requireRole('PATIENT'), wrap(async (req, res) => {
  const favorites = await prisma.favoriteDoctor.findMany({ where: { patientId: getPatientId(req.user) }, include: { doctor: { include: { user: { select: { name: true, avatarUrl: true } }, department: true, _count: { select: { reviews: true } } } } }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: favorites.map((favorite) => favorite.doctor) });
}));
router.post('/favorites/:doctorId', requireRole('PATIENT'), wrap(async (req, res) => {
  const doctor = await prisma.doctor.findFirst({ where: { id: req.params.doctorId, approved: true, active: true } });
  if (!doctor) throw new AppError('Doctor not found', 404);
  const favorite = await prisma.favoriteDoctor.upsert({
    where: { patientId_doctorId: { patientId: getPatientId(req.user), doctorId: doctor.id } },
    update: {}, create: { patientId: getPatientId(req.user), doctorId: doctor.id },
  });
  res.status(201).json({ success: true, data: favorite });
}));
router.delete('/favorites/:doctorId', requireRole('PATIENT'), wrap(async (req, res) => {
  await prisma.favoriteDoctor.deleteMany({ where: { patientId: getPatientId(req.user), doctorId: req.params.doctorId } });
  res.json({ success: true, data: null });
}));

router.get('/admin/users', requireRole('ADMIN'), wrap(async (req, res) => {
  const data = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.patch('/admin/users/:id/status', requireRole('ADMIN'), wrap(async (req, res) => {
  const status = z.enum(['ACTIVE', 'BLOCKED']).parse(req.body.status);
  if (req.params.id === req.user.id && status === 'BLOCKED') throw new AppError('You cannot block your own administrator account', 400);
  const current = await prisma.user.findUnique({ where: { id: req.params.id }, include: { doctor: true } });
  if (!current) throw new AppError('User not found', 404);
  const target = await prisma.user.update({ where: { id: req.params.id }, data: { status }, select: { id: true, name: true, email: true, role: true, status: true } });
  if (current.doctor) await prisma.doctor.update({ where: { id: current.doctor.id }, data: { active: status === 'ACTIVE' } });
  await audit(req.user.id, 'SET_STATUS', 'User', target.id, status);
  res.json({ success: true, data: target });
}));
router.get('/admin/doctors', requireRole('ADMIN'), wrap(async (req, res) => {
  const data = await prisma.doctor.findMany({ include: { user: { select: { id: true, name: true, email: true, status: true } }, department: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.put('/admin/doctors/:id', requireRole('ADMIN'), wrap(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100).optional(), specialization: z.string().trim().min(2).max(100).optional(),
    qualifications: z.string().trim().max(200).optional(), experienceYears: z.number().int().min(0).max(80).optional(),
    languages: z.string().trim().max(200).optional(), clinicName: z.string().trim().max(150).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(), consultationFee: z.number().finite().min(0).max(100000).optional(),
    bio: z.string().max(2000).nullable().optional(), departmentId: z.string().nullable().optional(),
  }).parse(req.body);
  const { name, ...doctorFields } = input;
  const existing = await prisma.doctor.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Doctor not found', 404);
  const doctor = await prisma.doctor.update({ where: { id: existing.id }, data: doctorFields, include: { user: true, department: true } });
  if (name) await prisma.user.update({ where: { id: doctor.userId }, data: { name } });
  await audit(req.user.id, 'UPDATE', 'Doctor', doctor.id, JSON.stringify(input));
  res.json({ success: true, data: doctor });
}));

router.post('/doctors/:id/reviews', requireRole('PATIENT'), wrap(async (req, res) => {
  const input = z.object({ appointmentId: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() }).parse(req.body);
  const appointment = await prisma.appointment.findFirst({ where: {
    id: input.appointmentId, doctorId: req.params.id, patientId: getPatientId(req.user), status: 'COMPLETED',
  } });
  if (!appointment) throw new AppError('A review is available after a completed visit with this doctor', 403);
  const review = await prisma.review.create({ data: {
    appointmentId: appointment.id, doctorId: appointment.doctorId, patientId: appointment.patientId,
    rating: input.rating, comment: input.comment,
  } });
  const average = await prisma.review.aggregate({ where: { doctorId: appointment.doctorId }, _avg: { rating: true } });
  await prisma.doctor.update({ where: { id: appointment.doctorId }, data: { ratingAvg: average._avg.rating || input.rating } });
  await audit(req.user.id, 'REVIEW', 'Doctor', appointment.doctorId, `${input.rating} stars`);
  res.status(201).json({ success: true, data: review });
}));
router.post('/admin/doctors', requireRole('ADMIN'), wrap(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email(), password: z.string().min(8).max(100), specialization: z.string().trim().min(2).max(100), departmentId: z.string().optional(), experienceYears: z.number().int().min(0).max(80).default(0), location: z.string().max(150).optional() }).parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const { name, email, password, ...doctorData } = input;
  const createdUser = await prisma.user.create({ data: { name, email: email.toLowerCase(), passwordHash, role: 'DOCTOR', doctor: { create: doctorData } }, include: { doctor: true } });
  await audit(req.user.id, 'CREATE', 'Doctor', createdUser.doctor.id, doctorData.specialization);
  res.status(201).json({ success: true, data: { id: createdUser.doctor.id, name: createdUser.name, email: createdUser.email, approved: false } });
}));
router.patch('/admin/doctors/:id/approval', requireRole('ADMIN'), wrap(async (req, res) => {
  const approved = z.boolean().parse(req.body.approved);
  const doctor = await prisma.doctor.update({ where: { id: req.params.id }, data: { approved, status: approved ? 'APPROVED' : 'REJECTED' }, include: { user: true } });
  await notify(doctor.userId, 'Doctor account updated', `Your account is ${approved ? 'approved' : 'rejected'}.`);
  await audit(req.user.id, approved ? 'APPROVE' : 'REJECT', 'Doctor', doctor.id, doctor.specialization);
  res.json({ success: true, data: doctor });
}));
router.get('/admin/audit-logs', requireRole('ADMIN'), wrap(async (req, res) => {
  const data = await prisma.auditLog.findMany({ include: { user: { select: { name: true, email: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ success: true, data });
}));
router.get('/admin/departments', requireRole('ADMIN'), wrap(async (req, res) => {
  const data = await prisma.department.findMany({ include: { _count: { select: { doctors: true } } }, orderBy: { name: 'asc' } });
  res.json({ success: true, data });
}));
router.post('/admin/departments', requireRole('ADMIN'), wrap(async (req, res) => {
  const name = z.string().trim().min(2).max(100).parse(req.body.name);
  const data = await prisma.department.create({ data: { name } });
  await audit(req.user.id, 'CREATE', 'Department', data.id, name);
  res.status(201).json({ success: true, data });
}));

router.get('/patients', requireRole('DOCTOR', 'ADMIN'), wrap(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const where = { ...(req.user.role === 'DOCTOR' ? doctorPatientWhere(getDoctorId(req.user)) : {}), ...(search ? { AND: [{ OR: [{ name: { contains: search } }, { patientId: { contains: search } }] }] } : {}) };
  const data = await prisma.patient.findMany({ where, include: { testResults: { orderBy: { testDate: 'desc' }, take: 1, include: { biomarker: true } }, user: { select: { email: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: data.map((patient) => ({ ...patient, testResults: patient.testResults.map(presentTestResult) })) });
}));

export default router;
