import { NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { visitService } from '../visits/visit.service';

function deriveInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function statusLabel(status: string): string {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'SUSPENDED') return 'Suspended';
  return 'Deactivated';
}

function formatGender(sex?: string | null): string {
  if (!sex) return '';
  if (sex === 'PREFER_NOT_TO_SAY') return 'Prefer not to say';
  return sex.charAt(0) + sex.slice(1).toLowerCase();
}

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

async function listAlerts(staffUserId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId: staffUserId, type: { in: [NotificationType.VISIT, NotificationType.ANNOUNCEMENT, NotificationType.MESSAGE, NotificationType.SYSTEM] } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50
  });

  return notifications.map(alertFromNotification);
}

async function markAlertRead(alertId: string, staffUserId: string) {
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
  const user = await prisma.user.findUnique({
    where: { id: staffUserId },
    include: { staffProfile: true }
  });

  if (!user || !user.staffProfile) {
    throw new ApiError(404, 'Staff profile not found');
  }

  const name = [user.staffProfile.firstName, user.staffProfile.lastName].filter(Boolean).join(' ');

  return {
    name,
    initials: deriveInitials(name),
    role: user.staffProfile.staffRoleLabel ?? 'Support Worker',
    email: user.businessEmail ?? user.email,
    gender: formatGender(user.staffProfile.sex),
    phone: user.staffProfile.phone,
    dob: user.staffProfile.dateOfBirth?.toISOString().slice(0, 10) ?? user.staffProfile.dobText ?? '',
    staffId: user.staffCode ?? user.id,
    zone: user.staffProfile.zone ?? '',
    accountStatus: statusLabel(user.status),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? user.updatedAt.toISOString()
  };
}

export const staffService = {
  getDashboardSummary,
  getProfile,
  listAlerts,
  markAlertRead,
  markAllAlertsRead
};
