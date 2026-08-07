import { NotificationType, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { sendNotificationEmail } from '../../config/mailer';
import { realtimeGateway } from '../../realtime/realtime.gateway';
import { notificationsService } from './notifications.service';

const db = prisma as any;

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

const jobs: NotificationEventJob[] = [];
let processing = false;

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
  if (value && typeof value === 'object' && channel in value) {
    return (value as Record<string, unknown>)[channel] !== false;
  }
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
      const notification = await db.notification.create({
        data: {
          userId: recipient.id,
          type,
          title: job.payload.title,
          body: job.payload.body,
          metadataJson: { ...(job.payload.metadataJson ?? {}), eventType: job.eventType }
        }
      });
      notificationId = notification.id;
      await createDelivery({ notificationId, userId: recipient.id, channel: 'DASHBOARD', status: 'SENT' });
      realtimeGateway.emitToUser(recipient.id, 'notification:created', notification);
      realtimeGateway.emitToUser(recipient.id, 'notification:unread_count', await notificationsService.getUnreadCount(recipient.id));
    } else {
      await createDelivery({ userId: recipient.id, channel: 'DASHBOARD', status: 'SKIPPED', reason: 'Preference disabled' });
    }

    if (emailAllowed && recipient.email) {
      try {
        await sendNotificationEmail({ to: recipient.email, subject: `DailyAssist — ${job.payload.title}`, title: job.payload.title, body: job.payload.body });
        await createDelivery({ notificationId, userId: recipient.id, channel: 'EMAIL', status: 'SENT' });
      } catch (error) {
        logger.error({ error, jobId: job.id, userId: recipient.id }, 'Notification email delivery failed');
        await createDelivery({ notificationId, userId: recipient.id, channel: 'EMAIL', status: 'FAILED', reason: 'Email delivery failed' });
      }
    } else {
      await createDelivery({ notificationId, userId: recipient.id, channel: 'EMAIL', status: 'SKIPPED', reason: emailAllowed ? 'Recipient email missing' : 'Preference disabled' });
    }
  }
}

async function drainQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (jobs.length) {
      const job = jobs.shift();
      if (job) await processJob(job);
    }
  } finally {
    processing = false;
  }
}

export async function enqueueNotificationEvent(eventType: NotificationEventType, payload: NotificationEventPayload): Promise<NotificationEventJob> {
  const job = { id: randomUUID(), eventType, payload, createdAt: new Date() };
  jobs.push(job);
  setImmediate(() => void drainQueue());
  return job;
}

export async function processNotificationEventNow(eventType: NotificationEventType, payload: NotificationEventPayload): Promise<void> {
  await processJob({ id: randomUUID(), eventType, payload, createdAt: new Date() });
}
