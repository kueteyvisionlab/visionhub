import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { env } from './config/env';
import { logger } from './utils/logger';
import { rateLimiter } from './middleware/rateLimiter';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

// ---------------------------------------------------------------------------
// Route imports
// ---------------------------------------------------------------------------
import authRouter from './routes/auth';
import tenantsRouter from './routes/tenants';
import usersRouter from './routes/users';
import contactsRouter from './routes/contacts';
import entitiesRouter from './routes/entities';
import ordersRouter from './routes/orders';
import serviceOrdersRouter from './routes/serviceOrders';
import pipelinesRouter from './routes/pipelines';
import dealsRouter from './routes/deals';
import emailRouter from './routes/email';
import smsRouter from './routes/sms';
import analyticsRouter from './routes/analytics';
import formsRouter from './routes/forms';
import bankingRouter from './routes/banking';
import webhooksRouter from './routes/webhooks';
import marketplaceRouter from './routes/marketplace';
import portalRouter from './routes/portal';
import reportsRouter from './routes/reports';

// ---------------------------------------------------------------------------
// App initialisation
// ---------------------------------------------------------------------------

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
  }),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// Rate limiting (applied globally; plan-aware after authentication)
app.use(rateLimiter);

// ---------------------------------------------------------------------------
// Health check (outside /api/v1 so load balancers can reach it easily)
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: process.env.npm_package_version ?? '0.1.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// ---------------------------------------------------------------------------
// API v1 routes
// ---------------------------------------------------------------------------
//
// AUDIT LOGGING:
// The auditLog middleware is designed to be added AFTER authenticate in each
// route file that needs auditing. For example, in routes/tenants.ts:
//
//   router.use(authenticate as any);
//   router.use(auditLog);           // <-- add after authenticate
//
// This ensures req.user and req.tenant are available when the audit record
// is created. Apply the same pattern to any route file that uses
// `router.use(authenticate)` and whose write operations should be tracked:
//   - routes/contacts.ts
//   - routes/entities.ts
//   - routes/orders.ts
//   - routes/deals.ts
//   - routes/pipelines.ts
//   - routes/users.ts
//   - etc.
//
// Import: import { auditLog } from '../middleware/auditLog';
// ---------------------------------------------------------------------------

const v1 = express.Router();

v1.use('/auth', authRouter);
v1.use('/tenants', tenantsRouter);
v1.use('/users', usersRouter);
v1.use('/contacts', contactsRouter);
v1.use('/entities', entitiesRouter);
v1.use('/orders', ordersRouter);
v1.use('/service-orders', serviceOrdersRouter);
v1.use('/pipelines', pipelinesRouter);
v1.use('/deals', dealsRouter);
v1.use('/email', emailRouter);
v1.use('/sms', smsRouter);
v1.use('/analytics', analyticsRouter);
v1.use('/forms', formsRouter);
v1.use('/banking', bankingRouter);
v1.use('/webhooks', webhooksRouter);
v1.use('/marketplace', marketplaceRouter);
v1.use('/portal', portalRouter);
v1.use('/reports', reportsRouter);

app.use('/api/v1', v1);

// ---------------------------------------------------------------------------
// Catch-all 404 + global error handler
// ---------------------------------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
