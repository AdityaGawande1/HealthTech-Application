import prisma from '../../../db.js';
import { AppError } from '../../../middleware/errorHandler.js';

export const presentTestResult = (result) => ({
  ...result,
  biomarkerName: result.biomarker?.name ?? '',
});

export async function resolveBiomarker(name, unit) {
  return prisma.biomarker.upsert({
    where: { name },
    update: {},
    create: { name, unit, category: 'Other' },
  });
}

export const testService = {
  async findByPatientId(patientId, biomarker) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new AppError('Patient not found', 404);

    const where = { patientId };
    if (biomarker) where.biomarker = { name: biomarker };

    const results = await prisma.testResult.findMany({
      where,
      orderBy: { testDate: 'desc' },
      include: { biomarker: true },
    });
    return results.map(presentTestResult);
  },

  async create(patientId, data) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new AppError('Patient not found', 404);

    const biomarker = await resolveBiomarker(data.biomarkerName, data.unit);
    const result = await prisma.testResult.create({
      data: {
        patientId: patient.id,
        biomarkerId: biomarker.id,
        value: data.value,
        unit: data.unit,
        testDate: new Date(data.testDate),
      },
      include: { biomarker: true },
    });
    return presentTestResult(result);
  },

  async delete(testId) {
    return prisma.testResult.delete({ where: { id: parseInt(testId) } });
  },
};
