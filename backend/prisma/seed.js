import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('MrxDemo123!', 12);
  const department = await prisma.department.upsert({ where: { name: 'Internal Medicine' }, update: {}, create: { name: 'Internal Medicine' } });
  await prisma.user.upsert({
    where: { email: 'admin@mrx.local' },
    update: {},
    create: { email: 'admin@mrx.local', name: 'Morgan Ellis', role: 'ADMIN', passwordHash },
  });
  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@mrx.local' },
    update: {},
    create: { email: 'doctor@mrx.local', name: 'Dr. Ananya Sharma', role: 'DOCTOR', passwordHash },
  });
  const doctor = await prisma.doctor.upsert({
    where: { userId: doctorUser.id }, update: { approved: true, active: true },
    create: { userId: doctorUser.id, departmentId: department.id, specialization: 'Internal Medicine', experienceYears: 12, location: 'Pune', bio: 'Fictional demonstration clinician.', approved: true },
  });
  await Promise.all([1, 2, 3, 4, 5].map((dayOfWeek) => prisma.doctorAvailability.upsert({
    where: { doctorId_dayOfWeek_startTime: { doctorId: doctor.id, dayOfWeek, startTime: '09:00' } },
    update: {}, create: { doctorId: doctor.id, dayOfWeek, startTime: '09:00', endTime: '17:00' },
  })));
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@mrx.local' },
    update: {},
    create: { email: 'patient@mrx.local', name: 'Rahul Patil', role: 'PATIENT', passwordHash },
  });
  const demoPatient = await prisma.patient.upsert({
    where: { userId: patientUser.id }, update: { doctorId: doctor.id },
    create: { userId: patientUser.id, doctorId: doctor.id, patientId: 'DEMO-P-001', name: 'Rahul Patil', age: 38, gender: 'Male', medicalHistory: 'Fictional demo profile. No real patient information.' },
  });
  const existingDemoTests = await prisma.testResult.count({ where: { patientId: demoPatient.id } });
  if (existingDemoTests === 0) {
    await prisma.testResult.createMany({ data: [
      { patientId: demoPatient.id, doctorId: doctor.id, biomarkerName: 'Blood Glucose', value: 96, unit: 'mg/dL', testDate: new Date('2026-07-10T09:00:00Z') },
      { patientId: demoPatient.id, doctorId: doctor.id, biomarkerName: 'Blood Glucose', value: 101, unit: 'mg/dL', testDate: new Date('2026-08-12T09:00:00Z') },
      { patientId: demoPatient.id, doctorId: doctor.id, biomarkerName: 'Blood Glucose', value: 98, unit: 'mg/dL', testDate: new Date('2026-09-10T09:00:00Z') },
    ] });
  }
  if (await prisma.appointment.count({ where: { patientId: demoPatient.id } }) === 0) {
    const startAt = new Date();
    startAt.setDate(startAt.getDate() + 2);
    startAt.setHours(10, 30, 0, 0);
    await prisma.appointment.create({ data: { patientId: demoPatient.id, doctorId: doctor.id, startAt, endAt: new Date(startAt.getTime() + 30 * 60_000), reason: 'Routine follow-up', status: 'CONFIRMED' } });
  }
  if (await prisma.prescription.count({ where: { patientId: demoPatient.id } }) === 0) {
    await prisma.prescription.create({ data: { patientId: demoPatient.id, doctorId: doctor.id, medication: 'Demo medication', dosage: 'As listed on the label', frequency: 'As directed by clinician', instructions: 'Fictional demonstration record.' } });
  }
  if (await prisma.report.count({ where: { patientId: demoPatient.id } }) === 0) {
    await prisma.report.create({ data: { patientId: demoPatient.id, doctorId: doctor.id, title: 'Routine follow-up summary', summary: 'Fictional demonstration report. Review with your clinician.', content: 'This example shows how clinician-entered reports appear in the patient portal.', published: true } });
  }
  console.log('Demo accounts are ready. Shared demo password: MrxDemo123!');

  // Keep real records safe: load demo data only into an empty database.
  const existingPatients = await prisma.patient.count();
  if (existingPatients > 0) {
    console.log('Database already contains patients; seed skipped to preserve existing records.');
    return;
  }

  // Create patients
  const patient1 = await prisma.patient.create({
    data: {
      patientId: 'P001',
      name: 'John Doe',
      age: 45,
      gender: 'Male',
      medicalHistory: 'Hypertension, Type 2 Diabetes',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      patientId: 'P002',
      name: 'Jane Smith',
      age: 32,
      gender: 'Female',
      medicalHistory: 'Asthma',
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      patientId: 'P003',
      name: 'Robert Johnson',
      age: 58,
      gender: 'Male',
      medicalHistory: 'Coronary Artery Disease, High Cholesterol',
    },
  });

  console.log('Created patients:', patient1.patientId, patient2.patientId, patient3.patientId);

  // Create test results for patient 1
  await prisma.testResult.createMany({
    data: [
      {
        patientId: patient1.id,
        biomarkerName: 'Glucose',
        value: 145,
        unit: 'mg/dL',
        testDate: new Date('2024-01-15'),
      },
      {
        patientId: patient1.id,
        biomarkerName: 'Glucose',
        value: 138,
        unit: 'mg/dL',
        testDate: new Date('2024-02-15'),
      },
      {
        patientId: patient1.id,
        biomarkerName: 'Glucose',
        value: 132,
        unit: 'mg/dL',
        testDate: new Date('2024-03-15'),
      },
      {
        patientId: patient1.id,
        biomarkerName: 'HbA1c',
        value: 7.2,
        unit: '%',
        testDate: new Date('2024-01-15'),
      },
      {
        patientId: patient1.id,
        biomarkerName: 'HbA1c',
        value: 6.9,
        unit: '%',
        testDate: new Date('2024-03-15'),
      },
      {
        patientId: patient1.id,
        biomarkerName: 'Blood Pressure',
        value: 142,
        unit: 'mmHg',
        testDate: new Date('2024-01-15'),
      },
      {
        patientId: patient1.id,
        biomarkerName: 'Blood Pressure',
        value: 138,
        unit: 'mmHg',
        testDate: new Date('2024-02-15'),
      },
      {
        patientId: patient1.id,
        biomarkerName: 'Blood Pressure',
        value: 135,
        unit: 'mmHg',
        testDate: new Date('2024-03-15'),
      },
    ],
  });

  // Create test results for patient 2
  await prisma.testResult.createMany({
    data: [
      {
        patientId: patient2.id,
        biomarkerName: 'Peak Flow',
        value: 380,
        unit: 'L/min',
        testDate: new Date('2024-01-10'),
      },
      {
        patientId: patient2.id,
        biomarkerName: 'Peak Flow',
        value: 420,
        unit: 'L/min',
        testDate: new Date('2024-02-10'),
      },
      {
        patientId: patient2.id,
        biomarkerName: 'Peak Flow',
        value: 450,
        unit: 'L/min',
        testDate: new Date('2024-03-10'),
      },
      {
        patientId: patient2.id,
        biomarkerName: 'FeNO',
        value: 35,
        unit: 'ppb',
        testDate: new Date('2024-01-10'),
      },
      {
        patientId: patient2.id,
        biomarkerName: 'FeNO',
        value: 28,
        unit: 'ppb',
        testDate: new Date('2024-03-10'),
      },
    ],
  });

  // Create test results for patient 3
  await prisma.testResult.createMany({
    data: [
      {
        patientId: patient3.id,
        biomarkerName: 'LDL Cholesterol',
        value: 155,
        unit: 'mg/dL',
        testDate: new Date('2024-01-20'),
      },
      {
        patientId: patient3.id,
        biomarkerName: 'LDL Cholesterol',
        value: 142,
        unit: 'mg/dL',
        testDate: new Date('2024-02-20'),
      },
      {
        patientId: patient3.id,
        biomarkerName: 'LDL Cholesterol',
        value: 130,
        unit: 'mg/dL',
        testDate: new Date('2024-03-20'),
      },
      {
        patientId: patient3.id,
        biomarkerName: 'Troponin',
        value: 0.02,
        unit: 'ng/mL',
        testDate: new Date('2024-01-20'),
      },
      {
        patientId: patient3.id,
        biomarkerName: 'Troponin',
        value: 0.01,
        unit: 'ng/mL',
        testDate: new Date('2024-03-20'),
      },
    ],
  });

  console.log('Created test results for all patients');
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
