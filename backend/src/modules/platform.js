import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import rateLimit from 'express-rate-limit';
import prisma from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateToken, requireRole, jwtSecret } from '../middleware/auth.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many sign-in attempts. Try again later.', errors: [] } });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const roles = ['ADMIN', 'DOCTOR', 'PATIENT'];
const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, patient: user.patient, doctor: user.doctor });
const session = (user) => ({ token: jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '8h' }), user: publicUser(user) });
const audit = (userId, action, entityType, entityId, details) => prisma.auditLog.create({ data: { userId, action, entityType, entityId, details } });
const notify = (userId, title, message) => prisma.notification.create({ data: { userId, title, message } });
const profileInclude = { patient: true, doctor: { include: { department: true, availability: { where: { active: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } } } };
const getPatientId = (user) => user.role === 'PATIENT' ? user.patient?.id : null;
const getDoctorId = (user) => user.role === 'DOCTOR' ? user.doctor?.id : null;

router.post('/auth/register', authLimiter, wrap(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200), password: z.string().min(8).max(100), age: z.number().int().min(0).max(120), gender: z.enum(['Male', 'Female', 'Other']) }).parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({ data: { name: input.name, email: input.email.toLowerCase(), passwordHash, role: 'PATIENT', patient: { create: { patientId: `P-${Date.now().toString(36).toUpperCase()}`, name: input.name, age: input.age, gender: input.gender } } }, include: profileInclude });
  await audit(user.id, 'REGISTER', 'User', user.id, 'Patient account created');
  res.status(201).json({ success: true, data: session(user) });
}));

router.post('/auth/login', authLimiter, wrap(async (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(1), role: z.enum(roles).optional() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() }, include: profileInclude });
  if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(input.password, user.passwordHash)) || (input.role && input.role !== user.role)) throw new AppError('Email or password is incorrect', 401);
  if (user.role === 'DOCTOR' && !user.doctor?.approved) throw new AppError('Your clinician account is awaiting administrator approval', 403);
  await audit(user.id, 'LOGIN', 'User', user.id, 'Signed in');
  res.json({ success: true, data: session(user) });
}));

router.get('/auth/me', authenticateToken, (req, res) => res.json({ success: true, data: publicUser(req.user) }));

router.use(authenticateToken);

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

router.get('/dashboard', wrap(async (req, res) => {
  const user = req.user;
  if (user.role === 'PATIENT') {
    const patientId = getPatientId(user);
    const [appointments, latestTests, prescriptions, reports, notifications] = await Promise.all([
      prisma.appointment.findMany({ where: { patientId, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] } }, orderBy: { startAt: 'asc' }, take: 3, include: { doctor: { include: { user: true, department: true } } } }),
      prisma.testResult.findMany({ where: { patientId }, orderBy: { testDate: 'desc' }, take: 8 }),
      prisma.prescription.count({ where: { patientId, status: 'ACTIVE' } }),
      prisma.report.count({ where: { patientId, published: true } }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return res.json({ success: true, data: { appointments, latestTests, prescriptions, reports, unreadNotifications: notifications } });
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
  res.json({ success: true, data: { patients, doctors, appointments, reports, pendingDoctors } });
}));

router.get('/doctors', wrap(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const where = { approved: true, active: true, ...(req.query.specialization ? { specialization: { contains: String(req.query.specialization) } } : {}), ...(search ? { OR: [{ specialization: { contains: search } }, { location: { contains: search } }, { user: { name: { contains: search } } }, { department: { name: { contains: search } } }] } : {}) };
  const doctors = await prisma.doctor.findMany({ where, include: { user: { select: { name: true } }, department: true, availability: { where: { active: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } }, orderBy: { user: { name: 'asc' } } });
  res.json({ success: true, data: doctors });
}));

router.get('/doctors/:id', wrap(async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: req.params.id }, include: { user: { select: { name: true } }, department: true, availability: { where: { active: true } } } });
  if (!doctor || !doctor.approved || !doctor.active) throw new AppError('Doctor not found', 404);
  res.json({ success: true, data: doctor });
}));

router.get('/appointments', wrap(async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : req.user.role === 'DOCTOR' ? { doctorId: getDoctorId(req.user) } : { patientId: getPatientId(req.user) };
  const appointments = await prisma.appointment.findMany({ where, include: { patient: true, doctor: { include: { user: { select: { name: true } }, department: true } } }, orderBy: { startAt: 'desc' } });
  res.json({ success: true, data: appointments });
}));

router.post('/appointments', requireRole('PATIENT'), wrap(async (req, res) => {
  const input = z.object({ doctorId: z.string(), startAt: z.string().datetime(), reason: z.string().trim().max(500).optional() }).parse(req.body);
  const startAt = new Date(input.startAt); const endAt = new Date(startAt.getTime() + 30 * 60_000);
  if (startAt <= new Date()) throw new AppError('Choose a future appointment time', 400);
  if (startAt.getUTCMinutes() % 30 !== 0 || startAt.getUTCSeconds() !== 0 || startAt.getUTCMilliseconds() !== 0) throw new AppError('Choose a time on the hour or half-hour', 400);
  const doctor = await prisma.doctor.findFirst({ where: { id: input.doctorId, approved: true, active: true }, include: { user: true } });
  if (!doctor) throw new AppError('Doctor is unavailable', 404);
  const localParts = new Intl.DateTimeFormat('en-US', { timeZone: doctor.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(startAt).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const endParts = new Intl.DateTimeFormat('en-US', { timeZone: doctor.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(endAt).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const localStart = `${localParts.hour}:${localParts.minute}`;
  const localEnd = `${endParts.hour}:${endParts.minute}`;
  const availability = await prisma.doctorAvailability.findFirst({ where: { doctorId: doctor.id, active: true, dayOfWeek: weekdays.indexOf(localParts.weekday), startTime: { lte: localStart }, endTime: { gte: localEnd } } });
  if (!availability) throw new AppError('That time is outside the doctor’s published availability', 400);
  const conflict = await prisma.appointment.findFirst({ where: { doctorId: doctor.id, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] }, startAt: { lt: endAt }, endAt: { gt: startAt } } });
  if (conflict) throw new AppError('That time is no longer available. Choose another time.', 409);
  const appointment = await prisma.appointment.create({ data: { patientId: getPatientId(req.user), doctorId: doctor.id, startAt, endAt, reason: input.reason }, include: { doctor: { include: { user: { select: { name: true } } } }, patient: true } });
  await Promise.all([notify(doctor.userId, 'Appointment request', `${req.user.name} requested an appointment.`), audit(req.user.id, 'BOOK', 'Appointment', appointment.id, `Doctor ${doctor.id}`)]);
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
  const updated = await prisma.appointment.update({ where: { id: appointment.id }, data: { status }, include: { patient: true, doctor: { include: { user: true } } } });
  if (appointment.patient.userId) await notify(appointment.patient.userId, 'Appointment updated', `Your appointment status is now ${status.toLowerCase()}.`);
  await audit(req.user.id, 'UPDATE_STATUS', 'Appointment', appointment.id, status);
  res.json({ success: true, data: updated });
}));

router.patch('/appointments/:id/cancel', wrap(async (req, res) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id }, include: { patient: true, doctor: { include: { user: true } } } });
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (req.user.role === 'PATIENT' && appointment.patientId !== getPatientId(req.user)) throw new AppError('You can only cancel your own appointments', 403);
  if (req.user.role === 'DOCTOR' && appointment.doctorId !== getDoctorId(req.user)) throw new AppError('You can only cancel your own appointments', 403);
  if (!['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status)) throw new AppError('This appointment can no longer be cancelled', 409);
  const updated = await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'CANCELLED' } });
  await audit(req.user.id, 'CANCEL', 'Appointment', appointment.id, 'Cancelled');
  res.json({ success: true, data: updated });
}));

router.patch('/appointments/:id/reschedule', requireRole('DOCTOR', 'ADMIN'), wrap(async (req, res) => {
  const input = z.object({ startAt: z.string().datetime() }).parse(req.body);
  const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id }, include: { patient: true, doctor: { include: { user: true } } } });
  if (!appointment) throw new AppError('Appointment not found', 404);
  if (req.user.role === 'DOCTOR' && appointment.doctorId !== getDoctorId(req.user)) throw new AppError('You can only manage your own appointments', 403);
  if (!['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status)) throw new AppError('This appointment can no longer be rescheduled', 409);
  const startAt = new Date(input.startAt); const endAt = new Date(startAt.getTime() + 30 * 60_000);
  if (startAt <= new Date() || startAt.getUTCMinutes() % 30 !== 0 || startAt.getUTCSeconds() !== 0 || startAt.getUTCMilliseconds() !== 0) throw new AppError('Choose a future time on the hour or half-hour', 400);
  const parts = (date, options) => new Intl.DateTimeFormat('en-US', { timeZone: appointment.doctor.timezone, ...options }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts(startAt, { weekday: 'short' }).weekday);
  const start = parts(startAt, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const end = parts(endAt, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  if (!await prisma.doctorAvailability.findFirst({ where: { doctorId: appointment.doctorId, active: true, dayOfWeek: day, startTime: { lte: `${start.hour}:${start.minute}` }, endTime: { gte: `${end.hour}:${end.minute}` } } })) throw new AppError('That time is outside the doctor’s published availability', 400);
  const conflict = await prisma.appointment.findFirst({ where: { id: { not: appointment.id }, doctorId: appointment.doctorId, status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] }, startAt: { lt: endAt }, endAt: { gt: startAt } } });
  if (conflict) throw new AppError('That time is no longer available. Choose another time.', 409);
  const updated = await prisma.appointment.update({ where: { id: appointment.id }, data: { startAt, endAt, status: 'RESCHEDULED' } });
  if (appointment.patient.userId) await notify(appointment.patient.userId, 'Appointment rescheduled', `Your visit was moved to ${startAt.toLocaleString()}.`);
  await audit(req.user.id, 'RESCHEDULE', 'Appointment', appointment.id, startAt.toISOString());
  res.json({ success: true, data: updated });
}));

router.get('/records', wrap(async (req, res) => {
  const patientId = req.user.role === 'ADMIN' ? (req.query.patientId || undefined) : req.user.role === 'DOCTOR' ? undefined : getPatientId(req.user);
  let patientWhere = patientId ? { patientId } : {};
  if (req.user.role === 'DOCTOR') patientWhere = { patient: { doctorId: getDoctorId(req.user) } };
  const [prescriptions, reports, history, results] = await Promise.all([
    prisma.prescription.findMany({ where: patientWhere, include: { doctor: { include: { user: { select: { name: true } } } }, patient: { select: { name: true, patientId: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.report.findMany({ where: { ...patientWhere, ...(req.user.role === 'PATIENT' ? { published: true } : {}) }, include: { doctor: { include: { user: { select: { name: true } } } }, patient: { select: { name: true, patientId: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.medicalHistory.findMany({ where: patientWhere, orderBy: { occurredAt: 'desc' } }),
    prisma.testResult.findMany({ where: patientWhere, orderBy: { testDate: 'desc' }, take: 100 }),
  ]);
  res.json({ success: true, data: { prescriptions, reports, history, results } });
}));

router.get('/patients/:id/results', wrap(async (req, res) => {
  const allowed = req.user.role === 'ADMIN'
    || (req.user.role === 'PATIENT' && getPatientId(req.user) === req.params.id)
    || (req.user.role === 'DOCTOR' && await prisma.patient.count({ where: { id: req.params.id, doctorId: getDoctorId(req.user) } }) > 0);
  if (!allowed) throw new AppError('You cannot access this patient record', 403);
  const data = await prisma.testResult.findMany({ where: { patientId: req.params.id }, orderBy: { testDate: 'desc' } });
  res.json({ success: true, data });
}));
router.post('/patients/:id/results', requireRole('DOCTOR', 'ADMIN'), wrap(async (req, res) => {
  const input = z.object({ biomarkerName: z.string().trim().min(1).max(100), value: z.number().finite(), unit: z.string().trim().min(1).max(30), testDate: z.string().datetime(), notes: z.string().max(1000).optional() }).parse(req.body);
  if (new Date(input.testDate) > new Date()) throw new AppError('Test date cannot be in the future', 400);
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, include: { user: true } });
  if (!patient) throw new AppError('Patient not found', 404);
  if (req.user.role === 'DOCTOR' && patient.doctorId !== getDoctorId(req.user)) throw new AppError('Patient is not assigned to you', 403);
  const result = await prisma.testResult.create({ data: { ...input, testDate: new Date(input.testDate), patientId: patient.id, doctorId: getDoctorId(req.user) } });
  await audit(req.user.id, 'CREATE', 'TestResult', String(result.id), result.biomarkerName);
  res.status(201).json({ success: true, data: result });
}));
router.delete('/tests/:id', requireRole('DOCTOR', 'ADMIN'), wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new AppError('Invalid test result id', 400);
  const result = await prisma.testResult.findUnique({ where: { id } });
  if (!result) throw new AppError('Test result not found', 404);
  if (req.user.role === 'DOCTOR' && result.doctorId !== getDoctorId(req.user)) throw new AppError('You can only remove results you recorded', 403);
  await prisma.testResult.delete({ where: { id } });
  await audit(req.user.id, 'DELETE', 'TestResult', String(id), result.biomarkerName);
  res.json({ success: true, data: null });
}));

router.post('/prescriptions', requireRole('DOCTOR'), wrap(async (req, res) => {
  const input = z.object({ patientId: z.string(), medication: z.string().trim().min(1).max(150), dosage: z.string().trim().min(1).max(100), frequency: z.string().trim().min(1).max(100), instructions: z.string().max(1000).optional(), endDate: z.string().datetime().optional() }).parse(req.body);
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, doctorId: getDoctorId(req.user) }, include: { user: true } });
  if (!patient) throw new AppError('Patient is not assigned to you', 403);
  const prescription = await prisma.prescription.create({ data: { ...input, endDate: input.endDate ? new Date(input.endDate) : null, doctorId: getDoctorId(req.user) } });
  if (patient.userId) await notify(patient.userId, 'New prescription', 'Your clinician added a prescription to your records.');
  await audit(req.user.id, 'CREATE', 'Prescription', prescription.id, input.medication);
  res.status(201).json({ success: true, data: prescription });
}));

router.post('/reports', requireRole('DOCTOR'), wrap(async (req, res) => {
  const input = z.object({ patientId: z.string(), title: z.string().trim().min(1).max(150), summary: z.string().trim().min(1).max(1000), content: z.string().max(10000).optional(), published: z.boolean().optional() }).parse(req.body);
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, doctorId: getDoctorId(req.user) }, include: { user: true } });
  if (!patient) throw new AppError('Patient is not assigned to you', 403);
  const report = await prisma.report.create({ data: { ...input, doctorId: getDoctorId(req.user) } });
  if (report.published && patient.userId) await notify(patient.userId, 'New medical report', 'A clinician published a report to your records.');
  await audit(req.user.id, 'CREATE', 'Report', report.id, report.title);
  res.status(201).json({ success: true, data: report });
}));

router.post('/medical-history', requireRole('DOCTOR'), wrap(async (req, res) => {
  const input = z.object({ patientId: z.string(), title: z.string().trim().min(1).max(150), details: z.string().trim().min(1).max(3000), occurredAt: z.string().datetime().optional() }).parse(req.body);
  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, doctorId: getDoctorId(req.user) } });
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
    || (req.user.role === 'PATIENT' && report.patientId === getPatientId(req.user) && report.published)
    || (req.user.role === 'DOCTOR' && report.doctorId === getDoctorId(req.user));
  if (!allowed) throw new AppError('You cannot access this report', 403);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="mrx-report-${report.id}.pdf"`);
  const pdf = new PDFDocument({ margin: 54, info: { Title: report.title, Author: 'MRX HealthTECH' } });
  pdf.pipe(res);
  pdf.fillColor('#0f766e').fontSize(11).text('MRX HEALTHTECH  ·  CLINICAL REPORT');
  pdf.moveDown().fillColor('#0f172a').fontSize(23).text(report.title);
  pdf.moveDown().fontSize(10).fillColor('#64748b').text(`Patient: ${report.patient.name} (${report.patient.patientId})`);
  pdf.text(`Clinician: ${report.doctor.user.name}`);
  pdf.text(`Date: ${report.createdAt.toLocaleDateString()}`);
  pdf.moveDown().fillColor('#0f172a').fontSize(15).text('Summary');
  pdf.moveDown(0.4).fontSize(11).text(report.summary, { lineGap: 4 });
  if (report.content) { pdf.moveDown().fontSize(15).text('Report details'); pdf.moveDown(0.4).fontSize(11).text(report.content, { lineGap: 4 }); }
  pdf.moveDown().fontSize(9).fillColor('#64748b').text('This report contains clinician-entered information. It does not provide an automated diagnosis.');
  pdf.end();
}));

router.get('/notifications', wrap(async (req, res) => {
  const data = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, data });
}));
router.patch('/notifications/:id/read', wrap(async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { readAt: new Date() } });
  if (!result.count) throw new AppError('Notification not found', 404);
  res.json({ success: true, data: { read: true } });
}));

router.get('/admin/users', requireRole('ADMIN'), wrap(async (req, res) => {
  const data = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));
router.patch('/admin/users/:id/status', requireRole('ADMIN'), wrap(async (req, res) => {
  const status = z.enum(['ACTIVE', 'BLOCKED']).parse(req.body.status);
  if (req.params.id === req.user.id && status === 'BLOCKED') throw new AppError('You cannot block your own administrator account', 400);
  const target = await prisma.user.update({ where: { id: req.params.id }, data: { status }, select: { id: true, name: true, email: true, role: true, status: true } });
  await audit(req.user.id, 'SET_STATUS', 'User', target.id, status);
  res.json({ success: true, data: target });
}));
router.get('/admin/doctors', requireRole('ADMIN'), wrap(async (req, res) => {
  const data = await prisma.doctor.findMany({ include: { user: { select: { id: true, name: true, email: true, status: true } }, department: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
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
  const doctor = await prisma.doctor.update({ where: { id: req.params.id }, data: { approved }, include: { user: true } });
  await notify(doctor.userId, 'Clinician account updated', `Your account is ${approved ? 'approved' : 'pending approval'}.`);
  await audit(req.user.id, approved ? 'APPROVE' : 'REVOKE_APPROVAL', 'Doctor', doctor.id, doctor.specialization);
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
  const where = { ...(req.user.role === 'DOCTOR' ? { doctorId: getDoctorId(req.user) } : {}), ...(search ? { OR: [{ name: { contains: search } }, { patientId: { contains: search } }] } : {}) };
  const data = await prisma.patient.findMany({ where, include: { testResults: { orderBy: { testDate: 'desc' }, take: 1 }, user: { select: { email: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data });
}));

export default router;
