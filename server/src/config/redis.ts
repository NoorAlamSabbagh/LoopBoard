import { Redis } from 'ioredis';
import { env, isProd } from './env.js';
import { logger } from './logger.js';
import { MemoryCache, type CacheStore } from './cache.js';

export let cache: CacheStore = new MemoryCache();
export let redisAvailable = false;

class RedisCache implements CacheStore {
  constructor(private readonly client: Redis) {}

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
    else await this.client.set(key, value);
  }

  async del(...keys: string[]) {
    if (keys.length) await this.client.del(...keys);
  }

  async keys(pattern: string) {
    return this.client.keys(pattern);
  }
}

export async function connectCache(): Promise<void> {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 800,
    lazyConnect: true,
    retryStrategy: () => null,
  });

  try {
    await client.connect();
    cache = new RedisCache(client);
    redisAvailable = true;
    logger.info('Redis connected');
  } catch (err) {
    client.disconnect();
    cache = new MemoryCache();
    redisAvailable = false;
    if (isProd) {
      throw err;
    }
    logger.warn(
      'Redis is not running on 127.0.0.1:6379. Using in-memory cache for refresh tokens and dashboard. Start Redis for multi-process production behavior.',
    );
  }
}
