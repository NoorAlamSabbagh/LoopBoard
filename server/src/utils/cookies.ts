import type { CookieOptions } from 'express';
import { env, isProd } from '../config/env.js';
export const REFRESH_COOKIE = 'loopboard_refresh';

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/api/auth',
    maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  };
}