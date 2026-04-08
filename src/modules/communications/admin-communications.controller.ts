import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { communicationsService } from './communications.service';

function currentUser(req: Request): { id: string; role: Role } {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return { id: req.user.id, role: req.user.role };
}

const createThread = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.createThread(req.body, user.role, user.id);
  return sendSuccess(res, 201, 'Thread created', result);
});

const listThreads = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.listThreads(req.query as any, user.role, user.id);
  return sendSuccess(res, 200, 'Threads retrieved', result);
});

const getThreadMessages = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.getThreadMessages(req.params.id as string, user.role, user.id);
  return sendSuccess(res, 200, 'Messages retrieved', result);
});

const postMessage = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.postMessage(
    req.params.id as string,
    req.body,
    user.role,
    user.id
  );
  return sendSuccess(res, 201, 'Message sent', result);
});

const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.deleteMessage(req.params.id as string, user.role, user.id);
  return sendSuccess(res, 200, 'Message deleted', result);
});

const listAnnouncements = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.listAnnouncements(user.role, user.id);
  return sendSuccess(res, 200, 'Announcements retrieved', result);
});

const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.createAnnouncement(req.body, user.id);
  return sendSuccess(res, 201, 'Announcement created', result);
});

const deleteAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const result = await communicationsService.deleteAnnouncement(req.params.id as string);
  return sendSuccess(res, 200, 'Announcement deleted', result);
});

const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.listNotifications(req.query as any, user.id);
  return sendSuccess(res, 200, 'Notifications retrieved', result);
});

const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.deleteNotification(req.params.id as string, user.id);
  return sendSuccess(res, 200, 'Notification deleted', result);
});

const getNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.getNotificationPreferences(user.id);
  return sendSuccess(res, 200, 'Notification preferences retrieved', result);
});

const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.updateNotificationPreferences(user.id, req.body);
  return sendSuccess(res, 200, 'Notification preferences updated', result);
});

export const adminCommunicationsController = {
  createThread,
  listThreads,
  getThreadMessages,
  postMessage,
  deleteMessage,
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  listNotifications,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences
};
