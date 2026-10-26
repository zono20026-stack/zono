import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import fs from 'fs';
import authRoutes from './routes/authRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import masterRoutes from './routes/masterRoutes.js';
import { query } from './config/db.js';
import { initializeDatabase } from './config/initDb.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Optimization Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: '*', // Configured for dev & PWA
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting on Authentication to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login attempts per IP per window
  message: {
    success: false,
    message: 'تم تجاوز الحد الأقصى لمحاولات الدخول، يرجى الانتظار 15 دقيقة',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Serve assets (logo, waybill templates)
app.use('/assets', express.static(path.join(__dirname, '../../assets')));

// Direct App Package Download Endpoint
app.get('/download/app', (_req: Request, res: Response) => {
  const archivePath = path.resolve(__dirname, '../../zono-app-release.zip');
  if (fs.existsSync(archivePath)) {
    return res.download(archivePath, 'zono-shipping-erp-v1.0.zip');
  }
  return res.status(404).json({ success: false, message: 'ملف التطبيق غير موجود' });
});

// Health & Readiness Probes for high concurrency / Load Balancers
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbCheck = await query('SELECT 1');
    return res.json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbCheck.rowCount === 1 ? 'CONNECTED' : 'DISCONNECTED',
      version: '1.0.0-enterprise',
    });
  } catch (err: any) {
    return res.status(503).json({ status: 'DOWN', error: err.message });
  }
});

// Mount Versioned API Routes (/api/v1)
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/shipments', shipmentRoutes);
app.use('/api/v1/tracking', trackingRoutes); // Public endpoint
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/master', masterRoutes);

// Static client build serving (Unified deployment support on Render/Docker)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.startsWith('/health')) {
      return next();
    }
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global Error Handler (Clean Arabic messages, no tech stack leak)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  const status = err.status || 500;
  const message = err.message || 'حدث خطأ داخلي في الخادم. يرجى مراجعة إدارة النظام';
  return res.status(status).json({
    success: false,
    message,
  });
});

app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 ZONO Enterprise Shipping ERP Backend Started!`);
  console.log(`📡 Port: ${PORT} | Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health Probe: http://localhost:${PORT}/health`);
  console.log(`=======================================================`);
  await initializeDatabase();
});
