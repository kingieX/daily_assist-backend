import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminMessagesController } from './admin-messages.controller';
import {
  bulkDeleteMessagesSchema,
  createThreadSchema,
  inboxQuerySchema,
  newDirectMessageSchema,
  idParamSchema,
  listThreadsQuerySchema,
  postMessageSchema,
  replyMessageSchema
} from '../communications/communications.validation';

const adminMessagesRouter = Router();

adminMessagesRouter.get('/messages', validate({ query: inboxQuerySchema }), adminMessagesController.listInbox);
adminMessagesRouter.post('/messages', validate({ body: newDirectMessageSchema }), adminMessagesController.startDirectMessage);
adminMessagesRouter.delete('/messages', validate({ body: bulkDeleteMessagesSchema }), adminMessagesController.bulkDeleteInbox);

adminMessagesRouter.post('/messages/threads', validate({ body: createThreadSchema }), adminMessagesController.createThread);
adminMessagesRouter.get('/messages/threads', validate({ query: listThreadsQuerySchema }), adminMessagesController.listThreads);
adminMessagesRouter.get('/messages/threads/:id/messages', validate({ params: idParamSchema }), adminMessagesController.getThreadMessages);
adminMessagesRouter.post('/messages/threads/:id/messages', validate({ params: idParamSchema, body: postMessageSchema }), adminMessagesController.postMessage);
adminMessagesRouter.get('/messages/:id', validate({ params: idParamSchema }), adminMessagesController.getInboxDetail);
adminMessagesRouter.post('/messages/:id/reply', validate({ params: idParamSchema, body: replyMessageSchema }), adminMessagesController.replyToMessage);
adminMessagesRouter.delete('/messages/:id', validate({ params: idParamSchema }), adminMessagesController.deleteInbox);

export { adminMessagesRouter };
