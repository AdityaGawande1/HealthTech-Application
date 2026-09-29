import { z } from 'zod';

export const testResultSchema = z.object({
  biomarkerName: z.string().trim().min(1, 'Biomarker name is required').max(100, 'Biomarker name must be 100 characters or less'),
  value: z.number({ required_error: 'Value is required', invalid_type_error: 'Value must be a number' }),
  unit: z.string().trim().min(1, 'Unit is required').max(50, 'Unit must be 50 characters or less'),
  testDate: z.string().datetime({ message: 'Test date must be a valid ISO 8601 date' }).refine(
    (date) => new Date(date) <= new Date(),
    { message: 'Test date cannot be in the future' }
  ),
});

export const validateTestResult = (data) => testResultSchema.parse(data);
