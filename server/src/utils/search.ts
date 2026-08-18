export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchFilter(q: string | undefined, fields: string[]) {
  if (!q?.trim()) return {};
  const pattern = escapeRegex(q.trim());
  return {
    $or: fields.map((field) => ({ [field]: { $regex: pattern, $options: 'i' } })),
  };
}
