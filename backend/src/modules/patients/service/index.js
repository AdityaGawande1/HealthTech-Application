import prisma from '../../../db.js';
import { presentTestResult } from '../../tests/service/index.js';

export const patientService = {
  async findAll(search) {
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { patientId: { contains: search } },
          ],
        }
      : {};

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        testResults: {
          orderBy: { testDate: 'desc' },
          take: 1,
          include: { biomarker: true },
        },
      },
    });
    return patients.map((patient) => ({ ...patient, testResults: patient.testResults.map(presentTestResult) }));
  },

  async findById(id) {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        testResults: {
          orderBy: { testDate: 'desc' },
          include: { biomarker: true },
        },
      },
    });
    return patient && { ...patient, testResults: patient.testResults.map(presentTestResult) };
  },

  async create(data) {
    return prisma.patient.create({
      data: {
        patientId: data.patientId,
        name: data.name,
        age: data.age,
        gender: data.gender,
        medicalHistory: data.medicalHistory,
      },
    });
  },

  async update(id, data) {
    return prisma.patient.update({
      where: { id },
      data,
    });
  },

  async delete(id) {
    return prisma.patient.delete({ where: { id } });
  },
};
