import { Role } from '@prisma/client';
import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { messagesService } from './messages.service';

function currentUser(req: Request): { id: string; role: Role } {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return { id: req.user.id, role: req.user.role };
}

const listInbox = asyncHandler(async (req: Request, res: Response) => {
  const result = await messagesService.listAdminInbox(req.query as any);
  return sendSuccess(res, 200, 'Messages retrieved', result);
});

const getInboxDetail = asyncHandler(async (req: Request, res: Response) => {
  const result = await messagesService.getAdminInboxDetail(req.params.id as string);
  return sendSuccess(res, 200, 'Message retrieved', result);
});

const startDirectMessage = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.startAdminMessage(req.body, user.id);
  return sendSuccess(res, 201, 'Message sent', result);
});

const replyToMessage = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.replyToConversation(req.params.id as string, req.body.text, user.role, user.id);
  return sendSuccess(res, 201, 'Reply sent', result);
});

const bulkDeleteInbox = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.bulkDeleteInbox(req.body.ids, user.id, user.role);
  return sendSuccess(res, 200, 'Messages deleted', result);
});

const deleteInbox = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.deleteInboxItem(req.params.id as string, user.id, user.role);
  return sendSuccess(res, 200, 'Message deleted', result);
});

const createThread = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.createThread(req.body, user.role, user.id);
  return sendSuccess(res, 201, 'Thread created', result);
});

const listThreads = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.listThreads(req.query as any, user.role, user.id);
  return sendSuccess(res, 200, 'Threads retrieved', result);
});

const getThreadMessages = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.getThreadMessages(req.params.id as string, user.role, user.id);
  return sendSuccess(res, 200, 'Messages retrieved', result);
});

const postMessage = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.postMessage(req.params.id as string, req.body, user.role, user.id);
  return sendSuccess(res, 201, 'Message sent', result);
});

const deleteThread = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.deleteThread(req.params.id as string, user.role, user.id);
  return sendSuccess(res, 200, 'Thread archived', result);
});

const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  const user = currentUser(req);
  const result = await messagesService.deleteMessage(req.params.id as string, req.params.messageId as string, user.role, user.id);
  return sendSuccess(res, 200, 'Message deleted', result);
});

export const adminMessagesController = {
  listInbox,
  getInboxDetail,
  startDirectMessage,
  replyToMessage,
  bulkDeleteInbox,
  deleteInbox,
  createThread,
  listThreads,
  getThreadMessages,
  postMessage,
  deleteThread,
  deleteMessage
};
