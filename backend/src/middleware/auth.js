import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { AppError } from './errorHandler.js';

const secret = process.env.JWT_SECRET || 'local-development-secret-change-before-deploying';
if (process.env.NODE_ENV === 'production' && (secret.length < 32 || secret === 'local-development-secret-change-before-deploying')) {
  throw new Error('Set a strong JWT_SECRET before starting in production.');
}

export async function authenticateToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new AppError('Sign in to continue', 401);
    const payload = jwt.verify(token, secret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { patient: true, doctor: { include: { department: true, availability: { where: { active: true }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] } } } } });
    if (!user || user.status !== 'ACTIVE') throw new AppError('Account is unavailable', 401);
    req.user = user;
    next();
  } catch (error) {
    next(error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError
      ? new AppError('Session expired. Sign in again.', 401)
      : error);
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError('You do not have permission to do that', 403));
  next();
};

export { secret as jwtSecret };
