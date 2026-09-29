import prisma from '../../../db.js';

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

    return prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        testResults: {
          orderBy: { testDate: 'desc' },
          take: 1,
        },
      },
    });
  },

  async findById(id) {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        testResults: {
          orderBy: { testDate: 'desc' },
        },
      },
    });
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