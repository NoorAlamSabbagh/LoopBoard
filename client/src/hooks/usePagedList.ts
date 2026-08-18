import { useEffect, useState } from 'react';
import type { ApiSuccess } from '@/types/api';
import { ApiClientError } from '@/services/api';

export function useDebouncedValue<T>(value: T, delay = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type Fetcher<T> = (query: Record<string, string | number | undefined>) => Promise<ApiSuccess<T[]>>;

export function usePagedList<T>(fetcher: Fetcher<T>, filters: Record<string, string | number | undefined>, limit = 20) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = () => setTick((n) => n + 1);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetcher({ ...filters, page, limit })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data ?? []);
        setMeta(res.meta ?? { page, limit, total: res.data?.length ?? 0, pages: 1 });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiClientError ? err.message : 'Failed to load');
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tick, filterKey, limit]);

  return { items, meta, loading, error, page, setPage, reload };
}
