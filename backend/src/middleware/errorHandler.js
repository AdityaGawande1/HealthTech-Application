import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    // Show the first problem in plain English instead of a generic "Validation failed".
    const first = err.errors[0];
    const field = String(first?.path?.[0] || 'input').replace(/([A-Z])/g, ' $1').toLowerCase();
    const message = /^(Invalid|Required|Expected)/i.test(first?.message || '') || !first?.message ? `Please check the ${field} and try again` : first.message;
    return res.status(400).json({ success: false, data: null, message, errors: errors.map((x, i) => (i === 0 ? { ...x, message } : x)) });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      const label = field === 'email' ? 'An account with this email already exists. Please sign in instead.' : field === 'license_number' ? 'This registration number is already in use.' : 'This record already exists.';
      return res.status(409).json({ success: false, data: null, message: label, errors: [] });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ success: false, data: null, message: 'The selected record no longer exists', errors: [] });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, data: null, message: 'Record not found', errors: [] });
    }
  }

  // Default error
  const status = err.status || 500;
  const message = status >= 500 ? 'An unexpected server error occurred' : (err.message || 'Request failed');
  res.status(status).json({ success: false, data: null, message, errors: [] });
};

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}
