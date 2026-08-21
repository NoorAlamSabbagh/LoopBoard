import type { FilterQuery } from 'mongoose';
import {
  communicationRepository,
  noteRepository,
  notificationRepository,
  recruiterRepository,
  resumeRepository,
} from '../repositories/index.js';
import { requireOwned } from '../utils/requireOwned.js';
import { searchFilter } from '../utils/search.js';
import { logActivity } from './activityService.js';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

type ListQuery = { page: number; limit: number; sort?: string; q?: string; companyId?: string };

export const recruiterService = {
  async list(userId: string, query: ListQuery) {
    const filter: FilterQuery<unknown> = {
      ...searchFilter(query.q, ['name', 'email', 'designation', 'notes']),
      ...(query.companyId ? { companyId: query.companyId } : {}),
    };
    return recruiterRepository.list(userId, { ...query, filter });
  },
  async get(userId: string, id: string) {
    const recruiter = await requireOwned(recruiterRepository, userId, id, 'Recruiter');
    const communications = await communicationRepository.list(userId, {
      page: 1,
      limit: 50,
      sort: '-happenedAt',
      filter: { recruiterId: id },
    });
    return { recruiter, communications: communications.items };
  },
  async create(userId: string, data: Record<string, unknown>) {
    const recruiter = await recruiterRepository.create({ ...data, userId });
    const id = String((recruiter as { id?: string }).id);
    await logActivity(userId, 'created', 'recruiter', id, `Added recruiter ${String(data.name)}`);
    return recruiter;
  },
  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(recruiterRepository, userId, id, 'Recruiter');
    return recruiterRepository.update(userId, id, data);
  },
  async remove(userId: string, id: string) {
    await requireOwned(recruiterRepository, userId, id, 'Recruiter');
    await recruiterRepository.delete(userId, id);
  },
  async addCommunication(userId: string, recruiterId: string, data: Record<string, unknown>) {
    await requireOwned(recruiterRepository, userId, recruiterId, 'Recruiter');
    const comm = await communicationRepository.create({ ...data, userId, recruiterId });
    await recruiterRepository.update(userId, recruiterId, { lastContactedAt: data.happenedAt ?? new Date() });
    return comm;
  },
};

export const noteService = {
  async list(userId: string, query: ListQuery & { entityType?: string; entityId?: string; tag?: string; folderPath?: string }) {
    const filter: FilterQuery<unknown> = {
      ...searchFilter(query.q, ['title', 'content', 'tags']),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.tag ? { tags: query.tag } : {}),
      ...(query.folderPath !== undefined ? { folderPath: query.folderPath } : {}),
    };
    return noteRepository.list(userId, { page: query.page, limit: query.limit, sort: query.sort, filter });
  },
  async get(userId: string, id: string) {
    return requireOwned(noteRepository, userId, id, 'Note');
  },
  async create(userId: string, data: Record<string, unknown>) {
    const note = await noteRepository.create({ ...data, userId });
    const id = String((note as { id?: string }).id);
    await logActivity(userId, 'created', 'note', id, `Added note ${String(data.title)}`);
    return note;
  },
  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(noteRepository, userId, id, 'Note');
    return noteRepository.update(userId, id, data);
  },
  async remove(userId: string, id: string) {
    await requireOwned(noteRepository, userId, id, 'Note');
    await noteRepository.delete(userId, id);
  },
};

export const resumeService = {
  async list(userId: string, query: ListQuery) {
    return resumeRepository.list(userId, {
      ...query,
      filter: searchFilter(query.q, ['name', 'targetRole']),
    });
  },
  async get(userId: string, id: string) {
    return requireOwned(resumeRepository, userId, id, 'Resume');
  },
  async create(userId: string, data: Record<string, unknown>, file?: Express.Multer.File) {
    let fileMeta = {};
    if (file) {
      fileMeta = {
        fileKey: file.path,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      };
    }
    const resume = await resumeRepository.create({ ...data, ...fileMeta, userId });
    const id = String((resume as { id?: string }).id);
    await logActivity(userId, 'created', 'resume', id, `Added resume ${String(data.name)}`);
    return resume;
  },
  async update(userId: string, id: string, data: Record<string, unknown>) {
    await requireOwned(resumeRepository, userId, id, 'Resume');
    return resumeRepository.update(userId, id, data);
  },
  async remove(userId: string, id: string) {
    const resume = await requireOwned(resumeRepository, userId, id, 'Resume');
    const fileKey = (resume as { fileKey?: string }).fileKey;
    if (fileKey) await unlink(fileKey).catch(() => undefined);
    await resumeRepository.delete(userId, id);
  },
};

export async function ensureUploadDir() {
  await mkdir(path.resolve(env.UPLOAD_DIR, 'resumes'), { recursive: true });
}

export const notificationService = {
  async list(userId: string, query: ListQuery & { unread?: string }) {
    const filter: FilterQuery<unknown> = query.unread === 'true' ? { readAt: null } : {};
    return notificationRepository.list(userId, { ...query, filter });
  },
  async markRead(userId: string, id: string) {
    await requireOwned(notificationRepository, userId, id, 'Notification');
    return notificationRepository.update(userId, id, { readAt: new Date() });
  },
  async create(userId: string, data: Record<string, unknown>) {
    return notificationRepository.create({ ...data, userId, channel: typeof data.channel === 'string' ? data.channel : 'in_app' });
  },
};
