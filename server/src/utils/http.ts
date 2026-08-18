import type { PaginationMeta } from './pagination.js';

export function success<T>(message: string, data: T, meta?: PaginationMeta) {
  return meta
    ? { success: true as const, message, data, meta }
    : { success: true as const, message, data };
}

export function failure(message: string, error: { code: string; details?: unknown }) {
  return { success: false as const, message, error };
}
