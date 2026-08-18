import { setDefaultResultOrder, setServers } from 'node:dns';
import mongoose from 'mongoose';
import '../models/index.js';
import { env } from './env.js';
import { logger } from './logger.js';

setDefaultResultOrder('ipv4first');

function redactMongoUri(uri: string): string {
  return uri.replace(/\/\/([^@/]+)@/, '//***@');
}

function isSrvDnsError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /querySrv|ENOTFOUND|ECONNREFUSED|ETIMEOUT|ESERVFAIL/i.test(message);
}

async function connectOnce(uri: string): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  return mongoose.connect(uri, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 15_000,
    family: 4,
  });
}

export async function connectDatabase(uri: string): Promise<typeof mongoose> {
  try {
    await connectOnce(uri);
  } catch (err) {
    if (!uri.startsWith('mongodb+srv://') || !isSrvDnsError(err)) {
      throw err;
    }
    logger.warn(
      'Atlas SRV DNS lookup failed on the system resolver. Retrying with 8.8.8.8 / 1.1.1.1.',
    );
    setServers(['8.8.8.8', '1.1.1.1']);
    await connectOnce(uri);
  }
  logger.info({ uri: redactMongoUri(uri), db: env.MONGODB_DB_NAME }, 'MongoDB connected');
  return mongoose;
}

export async function syncIndexes(): Promise<void> {
  const models = Object.values(mongoose.models);
  await Promise.all(models.map((m) => m.syncIndexes()));
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
