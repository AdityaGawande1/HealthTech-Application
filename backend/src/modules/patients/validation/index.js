import { z } from 'zod';

export const patientSchema = z.object({
  patientId: z.string().trim().min(1, 'Patient ID is required').max(50, 'Patient ID must be 50 characters or less'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  age: z.number().int('Age must be an integer').min(0, 'Age must be at least 0').max(120, 'Age must be at most 120'),
  gender: z.enum(['Male', 'Female', 'Other'], { errorMap: () => ({ message: 'Gender must be Male, Female, or Other' }) }),
  medicalHistory: z.string().trim().max(5000, 'Medical history must be 5000 characters or less').optional().nullable(),
});

export const patientUpdateSchema = patientSchema.omit({ patientId: true }).partial();

export const validatePatient = (data) => patientSchema.parse(data);
export const validatePatientUpdate = (data) => patientUpdateSchema.parse(data);
