import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const demoPassword = 'MrxDemo123!';
const doctors = [
  ['Ananya Sharma', 'Cardiology', 'MD, DM Cardiology', 14, 'Pune', 900, 'Female'],
  ['Kabir Mehta', 'Endocrinology', 'MD, DM Endocrinology', 11, 'Mumbai', 850, 'Male'],
  ['Meera Iyer', 'Internal Medicine', 'MBBS, MD Medicine', 9, 'Bengaluru', 700, 'Female'],
  ['Arjun Rao', 'Neurology', 'MBBS, MD, DM Neurology', 16, 'Hyderabad', 1100, 'Male'],
  ['Sara Khan', 'Dermatology', 'MBBS, MD Dermatology', 8, 'Delhi', 800, 'Female'],
  ['Ishaan Patel', 'Gastroenterology', 'MD, DM Gastroenterology', 13, 'Ahmedabad', 950, 'Male'],
  ['Diya Nair', 'Pulmonology', 'MBBS, MD Pulmonary Medicine', 10, 'Kochi', 750, 'Female'],
  ['Rohan Das', 'Nephrology', 'MD, DM Nephrology', 12, 'Kolkata', 1000, 'Male'],
];
const people = [
  ['PT01', 'Aditya Gawande', 46, 'Male'], ['PT02', 'Aarav Kulkarni', 34, 'Male'],
  ['PT03', 'Isha Deshmukh', 29, 'Female'], ['PT04', 'Vivaan Shah', 57, 'Male'],
  ['PT05', 'Anaya Reddy', 41, 'Female'], ['PT06', 'Reyansh Joshi', 63, 'Male'],
  ['PT07', 'Saanvi Menon', 25, 'Female'], ['PT08', 'Advik Banerjee', 51, 'Male'],
  ['PT09', 'Myra Chawla', 38, 'Female'], ['PT10', 'Harsh Sethi', 32, 'Male'],
];
const biomarkers = [
  ['HbA1c', '%', 4, 5.6, 'Glucose'], ['Fasting Glucose', 'mg/dL', 70, 99, 'Glucose'],
  ['Systolic BP', 'mmHg', 90, 120, 'Blood Pressure'], ['Diastolic BP', 'mmHg', 60, 80, 'Blood Pressure'],
  ['Total Cholesterol', 'mg/dL', 0, 200, 'Lipids'], ['LDL', 'mg/dL', 0, 100, 'Lipids'],
  ['HDL', 'mg/dL', 40, 100, 'Lipids'], ['Hemoglobin', 'g/dL', 12, 17.5, 'Blood'],
  ['Creatinine', 'mg/dL', 0.6, 1.3, 'Kidney'], ['TSH', 'mIU/L', 0.4, 4, 'Thyroid'],
  ['Vitamin D', 'ng/mL', 30, 100, 'Vitamins'], ['Biomarker A', 'units', 20, 60, 'Other'],
];
const historyDates = ['2025-09-01', '2025-09-08', '2025-09-15', '2025-09-22', '2025-09-29'];
const anchorValues = {
  'HbA1c': [7.1, 6.9, 6.7, 6.5, 6.3], 'Fasting Glucose': [142, 136, 128, 121, 115],
  'Systolic BP': [146, 142, 138, 134, 130], 'Diastolic BP': [94, 91, 88, 86, 84],
  'Total Cholesterol': [228, 219, 213, 205, 198], LDL: [151, 144, 135, 126, 119],
  HDL: [38, 39, 41, 42, 44], Hemoglobin: [13.4, 13.5, 13.6, 13.7, 13.8],
  Creatinine: [1.18, 1.16, 1.15, 1.12, 1.1], TSH: [3.8, 3.6, 3.4, 3.2, 3.1],
  'Vitamin D': [22, 24, 26, 28, 31], 'Biomarker A': [42, 38, 31, 25],
};

const urlAvatar = (name, background) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background}&color=fff&size=160`;
const dateAt = (dayOffset, hour = 10, minute = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
};
const stamp = (date) => new Date(`${date}T10:00:00.000Z`);

// This database is for local demonstrations; reset every table so repeated seeds stay deterministic.
async function clearDemoData() {
  await prisma.review.deleteMany();
  await prisma.favoriteDoctor.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.report.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalHistory.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.biomarker.deleteMany();
}

async function makeUsersAndProfiles(passwordHash) {
  const admin = await prisma.user.create({ data: {
    email: 'admin@mrx.local', name: 'Rajesh Kulkarni', role: 'ADMIN', passwordHash,
    avatarUrl: urlAvatar('Rajesh Kulkarni', '11'),
  } });
  const departmentIds = new Map();
  const doctorProfiles = [];
  for (const [index, entry] of doctors.entries()) {
    const [name, specialty, qualifications, years, city, fee, gender] = entry;
    const department = await prisma.department.upsert({ where: { name: specialty }, update: {}, create: { name: specialty } });
    departmentIds.set(specialty, department.id);
    const email = `doctor${index + 1}@mrx.local`;
    const user = await prisma.user.create({ data: {
      email, name: `Dr. ${name}`, role: 'DOCTOR', passwordHash,
      avatarUrl: urlAvatar(`Dr ${name}`, ['0f766e', '2563eb', '7c3aed', 'db2777'][index % 4]),
    } });
    const profile = await prisma.doctor.create({ data: {
      userId: user.id, departmentId: department.id, specialization: specialty,
      qualifications, experienceYears: years, languages: ['English, Hindi', 'English, Marathi'][index % 2],
      clinicName: `${specialty} Care Centre`, city, location: city, consultationFee: fee,
      bio: `Experienced ${specialty.toLowerCase()} specialist at MRX HealthTECH.`,
      gender, ratingAvg: 4.2 + (index % 8) * 0.1, status: 'APPROVED', approved: true,
    } });
    doctorProfiles.push({ ...profile, userId: user.id, name: user.name });
  }

  const patientProfiles = [];
  for (const [index, [patientId, name, age, gender]] of people.entries()) {
    const user = await prisma.user.create({ data: {
      email: `patient${index + 1}@mrx.local`, name, role: 'PATIENT', passwordHash,
      avatarUrl: urlAvatar(name, '0d9488'),
    } });
    const profile = await prisma.patient.create({ data: {
      userId: user.id, doctorId: doctorProfiles[index % doctorProfiles.length].id,
      patientId, name, age, gender, bloodGroup: ['O+', 'A+', 'B+', 'AB+'][index % 4],
      phone: `+91 90000 100${String(index).padStart(2, '0')}`,
      allergies: index % 3 === 0 ? 'No known allergies' : 'Seasonal pollen allergy',
      emergencyContact: `+91 91111 200${String(index).padStart(2, '0')}`,
      medicalHistory: index === 0 ? 'Under regular monitoring for blood sugar and blood pressure.' : 'No major past illness recorded.',
    } });
    patientProfiles.push({ ...profile, userId: user.id });
  }
  return { admin, doctorProfiles, patientProfiles };
}

async function makeAppointments({ doctorProfiles, patientProfiles }) {
  const completed = [];
  const make = async (id, patient, doctor, offset, status, reason) => {
    const startAt = dateAt(offset, 9 + (id.charCodeAt(id.length - 1) % 6), 0);
    return prisma.appointment.create({ data: {
      id, patientId: patient.id, doctorId: doctor.id, startAt,
      endAt: new Date(startAt.getTime() + 30 * 60_000), status, reason,
      cancelledBy: status === 'CANCELLED' ? 'PATIENT' : null,
    } });
  };
  for (let index = 0; index < doctorProfiles.length; index += 1) {
    completed.push(await make(`demo-completed-${index + 1}`, patientProfiles[index], doctorProfiles[index], -12 - index, 'COMPLETED', 'Follow-up consultation'));
  }
  await make('demo-pending-1', patientProfiles[0], doctorProfiles[0], 3, 'PENDING', 'Review recent lab results');
  await make('demo-confirmed-1', patientProfiles[1], doctorProfiles[1], 4, 'CONFIRMED', 'Routine check-in');
  await make('demo-cancelled-1', patientProfiles[2], doctorProfiles[2], -2, 'CANCELLED', 'Reschedule requested');
  return completed;
}

async function makeClinicalData({ doctorProfiles, patientProfiles, admin }) {
  const biomarkerRecords = [];
  for (const [name, unit, referenceMin, referenceMax, category] of biomarkers) {
    biomarkerRecords.push(await prisma.biomarker.create({ data: { name, unit, referenceMin, referenceMax, category } }));
  }
  for (const [patientIndex, patient] of patientProfiles.entries()) {
    const doctor = doctorProfiles[patientIndex % doctorProfiles.length];
    const selected = patientIndex === 0 ? biomarkerRecords : biomarkerRecords.slice(patientIndex % 6, (patientIndex % 6) + 4);
    for (const biomarker of selected) {
      const values = anchorValues[biomarker.name];
      const dates = patientIndex === 0 ? historyDates.slice(0, values.length) : historyDates.slice(0, 3);
      for (const [point, day] of dates.entries()) {
        const offset = patientIndex === 0 ? 0 : patientIndex * 3;
        const testDate = stamp(day);
        if (patientIndex !== 0) testDate.setUTCDate(testDate.getUTCDate() - offset);
        const value = values[point] + (patientIndex === 0 ? 0 : (patientIndex % 3) * (biomarker.category === 'Blood Pressure' ? 2 : 1));
        await prisma.testResult.create({ data: {
          patientId: patient.id, biomarkerId: biomarker.id, value, unit: biomarker.unit,
          testDate, doctorId: doctor.id, enteredById: doctor.userId,
          source: 'LAB', remarks: 'Laboratory result',
        } });
      }
    }
    if (patientIndex === 0) {
      const glucose = biomarkerRecords[1];
      await prisma.testResult.create({ data: {
        patientId: patient.id, biomarkerId: glucose.id, value: 118, unit: glucose.unit,
        testDate: dateAt(-1, 7), enteredById: patient.userId, source: 'SELF_REPORTED',
        remarks: 'Home reading',
      } });
    }
  }
  for (const [index, appointment] of (await prisma.appointment.findMany({ where: { status: 'COMPLETED' }, orderBy: { id: 'asc' } })).entries()) {
    const doctor = doctorProfiles[index % doctorProfiles.length];
    const patient = patientProfiles[index];
    const rating = 4 + (index % 2);
    await prisma.review.create({ data: {
      doctorId: doctor.id, patientId: patient.id, appointmentId: appointment.id, rating,
      comment: 'Explained everything clearly and followed up well.',
    } });
    await prisma.doctor.update({ where: { id: doctor.id }, data: { ratingAvg: rating } });
    if (index < 3) await prisma.favoriteDoctor.create({ data: { patientId: patient.id, doctorId: doctorProfiles[(index + 1) % doctorProfiles.length].id } });
  }
  for (const doctor of doctorProfiles) {
    await prisma.doctorAvailability.createMany({ data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      doctorId: doctor.id, dayOfWeek, startTime: '09:00', endTime: '17:00', slotMinutes: 30,
    })) });
  }
  await prisma.notification.create({ data: {
    userId: admin.id, type: 'WELCOME', title: 'Demo platform ready',
    message: 'Sample records have been loaded.', link: '/admin',
  } });
}

async function main() {
  console.log('Resetting the local demo records...');
  await clearDemoData();
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const accounts = await makeUsersAndProfiles(passwordHash);
  await makeAppointments(accounts);
  await makeClinicalData(accounts);
  console.log('\nSeed complete. Demo credentials (password for each: MrxDemo123!):');
  console.log('Admin:   admin@mrx.local');
  console.log('Doctor:  doctor1@mrx.local');
  console.log('Patient: patient1@mrx.local');
}

main()
  .catch((error) => { console.error('Seed failed:', error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
