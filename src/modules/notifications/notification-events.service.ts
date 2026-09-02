import { Job, Queue, Worker } from 'bullmq';
import { NotificationType, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import IORedis from 'ioredis';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { sendNotificationEmail } from '../../config/mailer';
import { emitRealtimeToUser } from '../../realtime/realtime-emitter';
import { notificationsService } from './notifications.service';

const db = prisma as any;
const QUEUE_NAME = 'notifications';

export type NotificationEventType =
  | 'message.created'
  | 'announcement.created'
  | 'visit.assigned'
  | 'visit.reassigned'
  | 'visit.cancelled'
  | 'visit.checkin.completed'
  | 'visit.checkout.completed'
  | 'visit.checkin.missed'
  | 'visit.checkout.missed'
  | 'booking.requested'
  | 'report.submitted'
  | 'account.signin'
  | 'account.info_changed'
  | 'system.alert';

export type NotificationEventPayload = {
  actorUserId?: string;
  recipientIds?: string[];
  roleRecipients?: Role[];
  title: string;
  body: string;
  type?: NotificationType;
  metadataJson?: Record<string, unknown>;
  adminSettingKey?: string;
};

export type NotificationEventJob = {
  id: string;
  eventType: NotificationEventType;
  payload: NotificationEventPayload;
  createdAt: Date;
};

type DeliveryChannel = 'DASHBOARD' | 'EMAIL' | 'WEBSOCKET';
type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

function alertFromNotification(notification: any) {
  return {
    id: notification.id,
    type: notification.type === NotificationType.VISIT ? 'warning' : notification.type === NotificationType.MESSAGE ? 'info' : 'yellow',
    text: [notification.title, notification.body].filter(Boolean).join(' - '),
    createdAt: notification.createdAt.toISOString(),
    read: Boolean(notification.readAt)
  };
}

const fallbackJobs: NotificationEventJob[] = [];
let processing = false;
let queue: Queue<NotificationEventPayload> | null = null;
let worker: Worker<NotificationEventPayload> | null = null;
let redisConnection: IORedis | null = null;

function getRedisConnection(): IORedis | null {
  if (!env.REDIS_URL) return null;
  if (!redisConnection) redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return redisConnection;
}

function getNotificationQueue(): Queue<NotificationEventPayload> | null {
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) queue = new Queue<NotificationEventPayload>(QUEUE_NAME, { connection });
  return queue;
}

function categoryFlag(type: NotificationType): 'messageEnabled' | 'announcementEnabled' | 'visitEnabled' | 'systemEnabled' {
  if (type === NotificationType.MESSAGE) return 'messageEnabled';
  if (type === NotificationType.ANNOUNCEMENT) return 'announcementEnabled';
  if (type === NotificationType.VISIT) return 'visitEnabled';
  return 'systemEnabled';
}

function adminChannelAllowed(settings: Record<string, unknown> | null, key: string | undefined, channel: 'email' | 'dashboard'): boolean {
  if (!key || !settings) return true;
  const value = settings[key];
  if (typeof value === 'boolean') return value;
  if (value && typeof value === 'object' && channel in value) return (value as Record<string, unknown>)[channel] !== false;
  return true;
}

async function loadAdminSettings(userId: string): Promise<Record<string, unknown> | null> {
  const row = await db.systemSetting.findUnique({ where: { key: `adminNotificationSettings:${userId}` }, select: { valueJson: true } });
  return (row?.valueJson as Record<string, unknown> | undefined) ?? null;
}

async function createDelivery(data: { notificationId?: string | null; userId: string; channel: DeliveryChannel; status: DeliveryStatus; reason?: string; attemptCount?: number }) {
  if (!db.notificationDelivery?.create) return null;
  return db.notificationDelivery.create({
    data: {
      notificationId: data.notificationId ?? null,
      userId: data.userId,
      channel: data.channel,
      status: data.status,
      reason: data.reason ?? null,
      attemptCount: data.attemptCount ?? (data.status === 'SKIPPED' ? 0 : 1),
      lastAttemptAt: data.status === 'SKIPPED' ? null : new Date()
    }
  });
}

async function resolveRecipients(payload: NotificationEventPayload) {
  const where: any = { status: 'ACTIVE' };
  if (payload.recipientIds?.length) where.id = { in: payload.recipientIds };
  if (payload.roleRecipients?.length) where.role = { in: payload.roleRecipients };
  if (!payload.recipientIds?.length && !payload.roleRecipients?.length) return [];
  return db.user.findMany({ where, select: { id: true, email: true, role: true } });
}

async function processJob(job: NotificationEventJob): Promise<void> {
  const recipients = await resolveRecipients(job.payload);
  const type = job.payload.type ?? NotificationType.SYSTEM;
  const flag = categoryFlag(type);

  for (const recipient of recipients) {
    const pref = await db.notificationPreference.upsert({ where: { userId: recipient.id }, update: {}, create: { userId: recipient.id } });
    const adminSettings = recipient.role === Role.ADMIN || recipient.role === Role.SUPER_ADMIN ? await loadAdminSettings(recipient.id) : null;
    const categoryEnabled = pref[flag] !== false;
    const dashboardAllowed = pref.inAppEnabled !== false && categoryEnabled && adminChannelAllowed(adminSettings, job.payload.adminSettingKey, 'dashboard');
    const emailAllowed = pref.emailEnabled !== false && categoryEnabled && adminChannelAllowed(adminSettings, job.payload.adminSettingKey, 'email');

    let notificationId: string | null = null;
    if (dashboardAllowed) {
      const notification = await db.notification.create({ data: { userId: recipient.id, type, title: job.payload.title, body: job.payload.body, metadataJson: { ...(job.payload.metadataJson ?? {}), eventType: job.eventType } } });
      notificationId = notification.id;
      await createDelivery({ notificationId, userId: recipient.id, channel: 'DASHBOARD', status: 'SENT' });
      emitRealtimeToUser(recipient.id, 'notification:created', notification);
      emitRealtimeToUser(recipient.id, 'alert:created', alertFromNotification(notification));
      emitRealtimeToUser(recipient.id, 'notification:unread_count', await notificationsService.getUnreadCount(recipient.id));
      emitRealtimeToUser(recipient.id, 'alert:unread_count', await notificationsService.getUnreadCount(recipient.id));
      await createDelivery({ notificationId, userId: recipient.id, channel: 'WEBSOCKET', status: 'SENT' });
    } else {
      await createDelivery({ userId: recipient.id, channel: 'DASHBOARD', status: 'SKIPPED', reason: 'Preference disabled' });
      await createDelivery({ userId: recipient.id, channel: 'WEBSOCKET', status: 'SKIPPED', reason: 'Dashboard preference disabled' });
    }

    if (emailAllowed && recipient.email) {
      try {
        await sendNotificationEmail({ to: recipient.email, subject: `DailyAssist — ${job.payload.title}`, title: job.payload.title, body: job.payload.body });
        await createDelivery({ notificationId, userId: recipient.id, channel: 'EMAIL', status: 'SENT' });
      } catch (error) {
        logger.error({ error, jobId: job.id, userId: recipient.id }, 'Notification email delivery failed');
        await createDelivery({ notificationId, userId: recipient.id, channel: 'EMAIL', status: 'FAILED', reason: 'Email delivery failed' });
        throw error;
      }
    } else {
      await createDelivery({ notificationId, userId: recipient.id, channel: 'EMAIL', status: 'SKIPPED', reason: emailAllowed ? 'Recipient email missing' : 'Preference disabled' });
    }
  }
}

async function drainFallbackQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (fallbackJobs.length) {
      const job = fallbackJobs.shift();
      if (job) await processJob(job);
    }
  } finally {
    processing = false;
  }
}

export async function enqueueNotificationEvent(eventType: NotificationEventType, payload: NotificationEventPayload): Promise<NotificationEventJob> {
  const fallbackJob = { id: randomUUID(), eventType, payload, createdAt: new Date() };
  const bullQueue = getNotificationQueue();
  if (bullQueue) {
    try {
      const bullJob = await bullQueue.add(eventType, payload, { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 });
      return { ...fallbackJob, id: bullJob.id ?? fallbackJob.id };
    } catch (error) {
      logger.error({ error, eventType }, 'Failed to enqueue notification job in BullMQ; falling back to in-process queue');
    }
  }
  fallbackJobs.push(fallbackJob);
  setImmediate(() => void drainFallbackQueue());
  return fallbackJob;
}

export async function processNotificationEventNow(eventType: NotificationEventType, payload: NotificationEventPayload): Promise<void> {
  await processJob({ id: randomUUID(), eventType, payload, createdAt: new Date() });
}

export function startNotificationWorker(): Worker<NotificationEventPayload> | null {
  const connection = getRedisConnection();
  if (!connection) {
    logger.warn('REDIS_URL is not set; notification events will use the in-process fallback queue');
    return null;
  }
  if (worker) return worker;
  worker = new Worker<NotificationEventPayload>(QUEUE_NAME, async (job: Job<NotificationEventPayload>) => processJob({ id: String(job.id), eventType: job.name as NotificationEventType, payload: job.data, createdAt: new Date(job.timestamp) }), { connection, concurrency: 5 });
  worker.on('failed', (job, error) => logger.error({ error, jobId: job?.id, eventType: job?.name }, 'Notification job failed'));
  worker.on('completed', (job) => logger.debug({ jobId: job.id, eventType: job.name }, 'Notification job completed'));
  logger.info('BullMQ notification worker started');
  return worker;
}
