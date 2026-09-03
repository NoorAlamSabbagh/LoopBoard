import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import pinoHttp from 'pino-http';
import { env, isProd } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiRouter, authRouter } from './routes/index.js';
import { success } from './utils/http.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: "https://loop-board-lyart.vercel.app",
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());
  app.use(
    (pinoHttp as unknown as (opts: { logger: typeof logger; autoLogging: boolean }) => RequestHandler)({
      logger,
      autoLogging: isProd,
    }),
  );

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/health', (_req, res) => {
    res.json(success('ok', { status: 'healthy' }));
  });

  // Keep-alive endpoint — ping this every 14 min via UptimeRobot to prevent Render cold starts
  app.get('/ping', (_req, res) => {
    res.sendStatus(200);
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api', apiLimiter, apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
