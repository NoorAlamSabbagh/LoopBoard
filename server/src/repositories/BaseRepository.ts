import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { paginate, skipTake, type ListResult } from '../utils/pagination.js';

export type ListOptions = {
  page: number;
  limit: number;
  sort?: string;
  filter?: FilterQuery<unknown>;
};

export class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  protected scoped(userId: string, extra: FilterQuery<T> = {}): FilterQuery<T> {
    const filter: FilterQuery<T> = { userId, ...extra };
    if (this.model.schema.path('deletedAt')) {
      (filter as { deletedAt?: null }).deletedAt = null;
    }
    return filter;
  }

  async list(userId: string, options: ListOptions): Promise<ListResult<T>> {
    const filter = this.scoped(userId, options.filter);
    const { skip, limit } = skipTake(options.page, options.limit);
    const sort = parseSort(options.sort);
    const [items, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items: items.map((item) => serialize(item) as T), meta: paginate(options.page, options.limit, total) };
  }

  async findById(userId: string, id: string): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findOne(this.scoped(userId, { _id: id })).lean();
    return doc ? (serialize(doc) as T) : null;
  }

  async create(data: Record<string, unknown>): Promise<T> {
    const doc = await this.model.create(data);
    return serialize(doc.toObject()) as T;
  }

  async update(userId: string, id: string, data: Record<string, unknown>): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findOneAndUpdate(this.scoped(userId, { _id: id }), data, { new: true, runValidators: true })
      .lean();
    return doc ? (serialize(doc) as T) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    if (this.model.schema.path('deletedAt')) {
      const updated = await this.model.findOneAndUpdate(
        this.scoped(userId, { _id: id }),
        { deletedAt: new Date() },
        { new: true },
      );
      return Boolean(updated);
    }
    const result = await this.model.deleteOne(this.scoped(userId, { _id: id }));
    return result.deletedCount > 0;
  }
}

function serialize(doc: unknown): Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
  const { _id, __v, passwordHash: _p, ...rest } = raw;
  return { id: _id ? String(_id) : undefined, ...rest };
}

function parseSort(sort?: string): Record<string, SortOrder> {
  if (!sort) return { createdAt: -1 };
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(field)) return { createdAt: -1 };
  return { [field]: desc ? -1 : 1 };
}
