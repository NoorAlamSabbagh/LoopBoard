import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { failure } from '../utils/http.js';

function isMongoDuplicate(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000;
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound('Route not found'));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(failure(err.message, { code: err.code, details: err.details }));
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json(failure('Validation failed', { code: 'VALIDATION_ERROR', details: err.flatten() }));
    return;
  }

  if (isMongoDuplicate(err)) {
    res.status(409).json(failure('Duplicate record', { code: 'CONFLICT' }));
    return;
  }

  logger.error({ err }, 'Unhandled error');
  const message = isProd ? 'Internal server error' : err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json(failure(message, { code: 'INTERNAL_ERROR' }));
}
