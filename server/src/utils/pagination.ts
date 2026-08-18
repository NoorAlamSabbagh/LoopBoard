export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ListResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

export function paginate(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}

export function skipTake(page: number, limit: number) {
  return { skip: (page - 1) * limit, limit };
}
