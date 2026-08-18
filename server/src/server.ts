import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { connectCache } from './config/redis.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';
import { startNotificationJobs } from './jobs/notifications.js';
import { ensureUploadDir } from './services/peopleDocsService.js';

async function main() {
  await connectDatabase(env.MONGODB_URI);
  await connectCache();
  await ensureUploadDir();
  startNotificationJobs();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Loopboard API listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
