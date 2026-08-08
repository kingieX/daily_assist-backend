import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { verifyEmailDelivery } from './config/mailer';
import { realtimeGateway } from './realtime/realtime.gateway';

async function startServer(): Promise<void> {
  await prisma.$connect();
  await verifyEmailDelivery();

  const server = app.listen(env.PORT, () => {
    realtimeGateway.attach(server);
    logger.info(`DailyAssist backend started on port ${env.PORT}`);
    logger.info(`Swagger UI available at http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('HTTP server closed and database disconnected.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

startServer().catch(async (error) => {
  logger.error({ error }, 'Failed to start server');
  await prisma.$disconnect();
  process.exit(1);
});
