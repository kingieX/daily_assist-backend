import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { notificationsService } from './notifications.service';

function currentUser(req: Request): { id: string; role: Role } {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return { id: req.user.id, role: req.user.role };
}

const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await notificationsService.listNotifications(req.query as any, user.id);
  return sendSuccess(res, 200, 'Notifications retrieved', result);
});

const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await notificationsService.markAdminNotificationRead(req.params.id as string, user.id);
  return sendSuccess(res, 200, 'Notification marked as read', result);
});

const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await notificationsService.markAllNotificationsRead(user.id);
  return sendSuccess(res, 200, 'Notifications marked as read', result);
});

const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await notificationsService.getUnreadCount(user.id);
  return sendSuccess(res, 200, 'Notification unread count retrieved', result);
});

const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await notificationsService.deleteNotification(req.params.id as string, user.id);
  return sendSuccess(res, 200, 'Notification deleted', result);
});

const getNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await notificationsService.getNotificationPreferences(user.id);
  return sendSuccess(res, 200, 'Notification preferences retrieved', result);
});

const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await notificationsService.updateNotificationPreferences(user.id, req.body);
  return sendSuccess(res, 200, 'Notification preferences updated', result);
});

export const adminNotificationsController = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences
};
