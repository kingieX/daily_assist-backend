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


const listInbox = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.listStaffInbox(user.id, req.query as any);
  return sendSuccess(res, 200, 'Messages retrieved', result);
});

const getInboxDetail = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.getStaffInboxDetail(req.params.id as string, user.id);
  return sendSuccess(res, 200, 'Message retrieved', result);
});

const replyToMessage = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.replyToConversation(req.params.id as string, req.body.text, user.role, user.id);
  return sendSuccess(res, 201, 'Reply sent', result);
});

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

const deleteInbox = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.deleteInboxItem(req.params.id as string, user.id, user.role);
  return sendSuccess(res, 200, 'Message deleted', result);
});

const listAnnouncements = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.listAnnouncements(user.role, user.id);
  return sendSuccess(res, 200, 'Announcements retrieved', result);
});

const markAnnouncementRead = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.markAnnouncementRead(req.params.id as string, user.id);
  return sendSuccess(res, 200, 'Announcement marked as read', result);
});

const acknowledgeAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.acknowledgeAnnouncement(req.params.id as string, user.id);
  return sendSuccess(res, 200, 'Announcement acknowledged', result);
});

const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.listNotifications(req.query as any, user.id);
  return sendSuccess(res, 200, 'Notifications retrieved', result);
});

const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await communicationsService.markNotificationRead(req.params.id as string, user.id);
  return sendSuccess(res, 200, 'Notification marked as read', result);
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

export const staffCommunicationsController = {
  listInbox,
  getInboxDetail,
  replyToMessage,
  createThread,
  listThreads,
  getThreadMessages,
  postMessage,
  deleteMessage,
  deleteInbox,
  listAnnouncements,
  markAnnouncementRead,
  acknowledgeAnnouncement,
  listNotifications,
  markNotificationRead,
  getNotificationPreferences,
  updateNotificationPreferences
};
