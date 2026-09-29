import prisma from '../../../db.js';
import { AppError } from '../../../middleware/errorHandler.js';

export const testService = {
  async findByPatientId(patientId, biomarker) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new AppError('Patient not found', 404);

    const where = { patientId };
    if (biomarker) {
      where.biomarkerName = biomarker;
    }

    return prisma.testResult.findMany({
      where,
      orderBy: { testDate: 'desc' },
    });
  },

  async create(patientId, data) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new AppError('Patient not found', 404);

    return prisma.testResult.create({
      data: {
        patientId: patient.id,
        biomarkerName: data.biomarkerName,
        value: data.value,
        unit: data.unit,
        testDate: new Date(data.testDate),
      },
    });
  },

  async delete(testId) {
    return prisma.testResult.delete({ where: { id: parseInt(testId) } });
  },
};