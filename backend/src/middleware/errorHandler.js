import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return res.status(400).json({ success: false, data: null, message: 'Validation failed', errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      return res.status(409).json({ success: false, data: null, message: `${field} already exists`, errors: [] });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ success: false, data: null, message: 'Referenced record does not exist', errors: [] });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, data: null, message: 'Record not found', errors: [] });
    }
  }

  // Default error
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ success: false, data: null, message, errors: [] });
};

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}
