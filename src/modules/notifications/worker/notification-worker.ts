import { logger } from '../../../config/logger';
import { prisma } from '../../../config/prisma';
import { startNotificationWorker } from '../notification-events.service';

async function main(): Promise<void> {
  await prisma.$connect();
  const worker = startNotificationWorker();
  if (!worker) logger.info('Notification worker is idle because REDIS_URL is not configured.');
}

void main().catch(async (error) => {
  logger.error({ error }, 'Failed to start notification worker');
  await prisma.$disconnect();
  process.exit(1);
});
