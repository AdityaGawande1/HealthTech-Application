import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import patientRoutes from './modules/patients/routes/index.js';
import testRoutes from './modules/tests/routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import platformRoutes from './modules/platform.js';
import { authenticateToken, requireRole } from './middleware/auth.js';
import swaggerUi from 'swagger-ui-express';

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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup({
  openapi: '3.0.3',
  info: { title: 'MRX HealthTECH API', version: '1.0.0', description: 'Fictional local healthcare management demo API.' },
  servers: [{ url: 'http://localhost:3001/api' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': { post: { security: [], summary: 'Sign in', responses: { 200: { description: 'Session and user profile' }, 401: { description: 'Invalid credentials' } } } },
    '/auth/register': { post: { security: [], summary: 'Register patient or pending doctor account', responses: { 201: { description: 'Account created' } } } },
    '/dashboard': { get: { summary: 'Role-specific dashboard metrics', responses: { 200: { description: 'Database-backed dashboard data' } } } },
    '/doctors': { get: { security: [], summary: 'Search approved doctors', responses: { 200: { description: 'Filtered doctor profiles' } } } },
    '/doctors/{id}/slots': { get: { security: [], summary: 'List bookable slots', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'Availability for the requested date' } } } },
    '/appointments': { get: { summary: 'List appointments scoped to current role', responses: { 200: { description: 'Appointments' } } }, post: { summary: 'Book an available appointment slot', responses: { 201: { description: 'Appointment request' }, 409: { description: 'Slot unavailable' } } } },
    '/records': { get: { summary: 'List authorized clinical records', responses: { 200: { description: 'Results, prescriptions, reports and history' } } } },
    '/reports/{id}/pdf': { get: { summary: 'Download authorized report PDF', responses: { 200: { description: 'PDF document' } } } },
    '/notifications': { get: { summary: 'List user notifications', responses: { 200: { description: 'Notifications' } } } },
    '/admin/audit-logs': { get: { summary: 'Administrator audit log', responses: { 200: { description: 'Recent audited events' }, 403: { description: 'Admin role required' } } } },
  },
}, { explorer: true }));

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
