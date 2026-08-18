export type CacheStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  keys(pattern: string): Promise<string[]>;
};

type Entry = { value: string; expiresAt?: number };

export class MemoryCache implements CacheStore {
  private readonly store = new Map<string, Entry>();

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(...keys: string[]) {
    for (const key of keys) this.store.delete(key);
  }

  async keys(pattern: string) {
    const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
    const now = Date.now();
    const matched: string[] = [];
    for (const [key, entry] of this.store) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.store.delete(key);
        continue;
      }
      if (key.startsWith(prefix) || key === pattern) matched.push(key);
    }
    return matched;
  }
}
