import { ApiError } from './ApiError.js';
import type { BaseRepository } from '../repositories/BaseRepository.js';

export async function requireOwned<T>(
  repo: BaseRepository<T>,
  userId: string,
  id: string,
  label: string,
): Promise<T> {
  const item = await repo.findById(userId, id);
  if (!item) throw ApiError.notFound(`${label} not found`);
  return item;
}
