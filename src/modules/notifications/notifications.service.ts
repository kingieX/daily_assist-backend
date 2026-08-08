import { communicationsService } from '../communications/communications.service';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { realtimeGateway } from '../../realtime/realtime.gateway';
import type { ListNotificationsQuery, UpdateNotificationPreferencesInput } from '../communications/communications.validation';

const db = prisma as any;

async function listNotifications(query: ListNotificationsQuery, userId: string) {
  return communicationsService.listNotifications(query, userId);
}

async function markNotificationRead(notificationId: string, userId: string) {
  const result = await communicationsService.markNotificationRead(notificationId, userId);
  realtimeGateway.emitToUser(userId, 'notification:read', { id: notificationId });
  realtimeGateway.emitToUser(userId, 'alert:read', { id: notificationId });
  realtimeGateway.emitToUser(userId, 'notification:unread_count', await getUnreadCount(userId));
  realtimeGateway.emitToUser(userId, 'alert:unread_count', await getUnreadCount(userId));
  return result;
}

async function deleteNotification(notificationId: string, userId: string) {
  const result = await communicationsService.deleteNotification(notificationId, userId);
  realtimeGateway.emitToUser(userId, 'notification:deleted', { id: notificationId });
  realtimeGateway.emitToUser(userId, 'notification:unread_count', await getUnreadCount(userId));
  realtimeGateway.emitToUser(userId, 'alert:unread_count', await getUnreadCount(userId));
  return result;
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
  realtimeGateway.emitToUser(userId, 'notification:read', { all: true });
  realtimeGateway.emitToUser(userId, 'alert:read', { all: true });
  realtimeGateway.emitToUser(userId, 'notification:unread_count', await getUnreadCount(userId));
  realtimeGateway.emitToUser(userId, 'alert:unread_count', await getUnreadCount(userId));
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
