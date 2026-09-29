import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import patientRoutes from './modules/patients/routes/index.js';
import testRoutes from './modules/tests/routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import platformRoutes from './modules/platform.js';
import { authenticateToken, requireRole } from './middleware/auth.js';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
    message: 'Service is healthy',
    errors: [],
  });
});

app.use('/api', platformRoutes);
// Preserve legacy monitoring routes for admins; user-scoped clinical APIs live in platformRoutes.
app.use('/api/patients', authenticateToken, requireRole('ADMIN'), patientRoutes);
app.use('/api/patients/:id/tests', authenticateToken, requireRole('ADMIN'), testRoutes);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: 'Route not found',
    errors: [],
  });
});

export default app;
