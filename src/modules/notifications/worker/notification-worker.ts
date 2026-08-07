import { logger } from '../../../config/logger';

logger.info('Notification worker entrypoint loaded. In this build, jobs are processed by the in-process notification event queue. Configure BullMQ + Redis in a follow-up deployment dependency change.');
