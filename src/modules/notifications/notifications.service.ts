import { communicationsService } from '../communications/communications.service';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import type { ListNotificationsQuery, UpdateNotificationPreferencesInput } from '../communications/communications.validation';

const db = prisma as any;

async function listNotifications(query: ListNotificationsQuery, userId: string) {
  return communicationsService.listNotifications(query, userId);
}

async function markNotificationRead(notificationId: string, userId: string) {
  return communicationsService.markNotificationRead(notificationId, userId);
}

async function deleteNotification(notificationId: string, userId: string) {
  return communicationsService.deleteNotification(notificationId, userId);
}

async function getNotificationPreferences(userId: string) {
  return communicationsService.getNotificationPreferences(userId);
}

async function updateNotificationPreferences(userId: string, input: UpdateNotificationPreferencesInput) {
  return communicationsService.updateNotificationPreferences(userId, input);
}

async function getUnreadCount(userId: string) {
  const count = await db.notification.count({ where: { userId, readAt: null } });
  return { count };
}

async function markAllNotificationsRead(userId: string) {
  const result = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() }
  });
  return { updatedCount: result.count };
}

async function markAdminNotificationRead(notificationId: string, userId: string) {
  return markNotificationRead(notificationId, userId);
}

async function deleteStaffNotification(notificationId: string, userId: string) {
  return deleteNotification(notificationId, userId);
}

async function requireNotification(notificationId: string, userId: string) {
  const notification = await db.notification.findFirst({ where: { id: notificationId, userId }, select: { id: true } });
  if (!notification) throw new ApiError(404, 'Notification not found');
  return notification;
}

export const notificationsService = {
  listNotifications,
  markNotificationRead,
  markAdminNotificationRead,
  deleteNotification,
  deleteStaffNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  getUnreadCount,
  markAllNotificationsRead,
  requireNotification
};
