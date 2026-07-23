import { NotificationType, VisitStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { visitService } from '../visits/visit.service';

function dayBounds() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function greeting() {
  const hour = new Date().getUTCHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function workerName(user: any) {
  return [user?.staffProfile?.firstName, user?.staffProfile?.lastName].filter(Boolean).join(' ').trim() || user?.email || '';
}

function milesLabel(miles: number) {
  const rounded = Number(miles.toFixed(2));
  return `${rounded} ${rounded === 1 ? 'mile' : 'miles'}`;
}

async function getDashboardSummary(staffUserId: string) {
  const { start, end } = dayBounds();
  const [staff, todayVisits, logs] = await Promise.all([
    prisma.user.findUnique({ where: { id: staffUserId }, include: { staffProfile: true } }),
    visitService.listStaffTodayVisits(staffUserId),
    (prisma as any).visitLog.findMany({ where: { staffId: staffUserId, submittedAt: { gte: start, lt: end } }, select: { miles: true } })
  ]);

  const completed = todayVisits.filter((visit: any) => visit.status === 'completed').length;
  const nextVisit = todayVisits.find((visit: any) => visit.status !== 'completed') ?? null;
  const miles = logs.reduce((sum: number, log: any) => sum + Number(log.miles ?? 0), 0);

  return {
    greeting: greeting(),
    workerName: workerName(staff),
    visitsToday: todayVisits.length,
    completed,
    remaining: todayVisits.length - completed,
    milesCovered: milesLabel(miles),
    nextVisit
  };
}

function metadataString(metadata: unknown, key: string): string | null {
  return metadata && typeof metadata === 'object' && key in metadata ? String((metadata as any)[key]) : null;
}

function alertFromNotification(notification: any) {
  const isAnnouncement = notification.type === NotificationType.ANNOUNCEMENT;
  const visitId = metadataString(notification.metadataJson, 'visitId');
  return {
    id: notification.id,
    type: isAnnouncement ? 'announcement' : 'new_visit',
    title: notification.title,
    message: notification.body,
    relatedVisitId: isAnnouncement ? null : visitId,
    relatedAnnouncementId: isAnnouncement ? metadataString(notification.metadataJson, 'announcementId') : null,
    createdAt: notification.createdAt.toISOString(),
    read: Boolean(notification.readAt)
  };
}

function reminderAlert(visit: any) {
  return {
    id: `visit-reminder:${visit.id}`,
    type: 'visit_reminder',
    title: 'Visit starting soon',
    message: `${visit.clientName} is scheduled at ${visit.timeStart}.`,
    relatedVisitId: visit.id,
    relatedAnnouncementId: null,
    createdAt: new Date().toISOString(),
    read: false
  };
}

async function listAlerts(staffUserId: string) {
  const now = new Date();
  const reminderWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);
  const [notifications, reminderVisits] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: staffUserId, type: { in: [NotificationType.VISIT, NotificationType.ANNOUNCEMENT] } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50
    }),
    prisma.visit.findMany({
      where: { staffId: staffUserId, status: { in: [VisitStatus.ASSIGNED, VisitStatus.ACKNOWLEDGED] }, checkInAt: null, scheduledStartAt: { gte: now, lte: reminderWindowEnd } },
      include: { booking: { include: { bookingServices: true, client: true, package: true } }, staff: { include: { staffProfile: true } } },
      orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }]
    })
  ]);

  const alerts = [...reminderVisits.map((visit) => reminderAlert((visitService as any).serializeStaffVisitListItem?.(visit) ?? {
    id: visit.id,
    clientName: visit.booking?.client ? [visit.booking.client.firstName, visit.booking.client.lastName].filter(Boolean).join(' ') : 'Your client',
    timeStart: visit.scheduledStartAt.toISOString().slice(11, 16)
  })), ...notifications.map(alertFromNotification)];
  return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function markAlertRead(alertId: string, staffUserId: string) {
  if (alertId.startsWith('visit-reminder:')) return { id: alertId, read: true };
  const notification = await prisma.notification.findFirst({ where: { id: alertId, userId: staffUserId } });
  if (!notification) throw new ApiError(404, 'Alert not found');
  const updated = notification.readAt ? notification : await prisma.notification.update({ where: { id: alertId }, data: { readAt: new Date() } });
  return { ...alertFromNotification(updated), read: true };
}

async function markAllAlertsRead(staffUserId: string) {
  await prisma.notification.updateMany({ where: { userId: staffUserId, type: { in: [NotificationType.VISIT, NotificationType.ANNOUNCEMENT] }, readAt: null }, data: { readAt: new Date() } });
  return { read: true };
}

async function getProfile(staffUserId: string) {
  const { getStaffProfile } = await import('../admin/admin-settings.service');
  return getStaffProfile(staffUserId);
}

export const staffService = {
  getDashboardSummary,
  getProfile,
  listAlerts,
  markAlertRead,
  markAllAlertsRead
};
