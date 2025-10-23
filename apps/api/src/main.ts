// main.ts
import express, { Express } from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import dotenv from 'dotenv';
import { z } from 'zod';

// Import routes
import authRoutes from './routes/auth';
import signatureRoutes from './routes/signature';
import messageRoutes from './routes/messages';

// Load environment variables
dotenv.config();

// ENVIRONMENT VARIABLE VALIDATION & LOGGING

const requiredEnvVars = {
  'NODE_ENV': process.env.NODE_ENV,
  'PORT': process.env.PORT,
  'DATABASE_URL': process.env.DATABASE_URL ? '✓ SET (hidden)' : '✗ NOT SET',
  'SESSION_SECRET': process.env.SESSION_SECRET ? '✓ SET (hidden)' : '✗ NOT SET',
  'CORS_ORIGINS': process.env.CORS_ORIGINS,
  'MFA_SERVER_SALT': process.env.MFA_SERVER_SALT ? '✓ SET (hidden)' : '✗ NOT SET',
};

console.log('Required Environment Variables:');
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  const status = value ? '✓' : '✗';
  console.log(`  ${status} ${key}: ${value || '✗ NOT SET'}`);
});

// Check for missing critical vars
const missingVars = [];
if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');
if (!process.env.SESSION_SECRET) missingVars.push('SESSION_SECRET');

if (missingVars.length > 0) {
  console.error('   CRITICAL: Missing required environment variables:', missingVars.join(', '));
  console.error('   Server may not function correctly!\n');
}

// APP INITIALIZATION

export const app: Express = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3001'];

console.log('   CORS Configuration:');
console.log('   Origins:', corsOrigins);
console.log('   Credentials: true\n');

const corsOptions = {
  origin: corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));


// Proxy trust (for Cloud Run)
// We need to trust it for secure cookies to work properly
app.set('trust proxy', 1);
console.log('Trust Proxy, with 1 hop enabled');


// Session configuration
const sessionConfig = {
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  },
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000, // 2 minutes
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  }),
};

console.log(' Session Configuration:');
console.log('   Cookie.secure:', sessionConfig.cookie.secure);
console.log('   Cookie.sameSite:', sessionConfig.cookie.sameSite);
console.log('   Cookie.httpOnly:', sessionConfig.cookie.httpOnly);
console.log('   Cookie.maxAge:', sessionConfig.cookie.maxAge, 'ms');
console.log('   Store: PrismaSessionStore');
console.log('   Secret: ', process.env.SESSION_SECRET ? '✓ SET' : '✗ USING DEFAULT (INSECURE!)');
console.log('\n========================================\n');

app.use(session(sessionConfig));

// Session debugging middleware
app.use((req, _res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    hasSession: !!req.session,
    sessionID: req.sessionID || 'none',
    hasCookieHeader: !!req.headers.cookie,
    origin: req.headers.origin,
  };
  
  // Only log non-health check requests
  if (req.path !== '/health') {
    console.log('[SESSION]', JSON.stringify(logData));
  }
  
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/', signatureRoutes);
app.use('/messages', messageRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ): void => {
    console.error('[ERROR]', err.stack);

    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        status: 400,
        success: false,
        details: err.issues,
      });
      return;
    }

    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      status: err.status || 500,
      success: false,
    });
  },
);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;