import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminCommunicationsController } from '../communications/admin-communications.controller';
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

adminMessagesRouter.get('/messages', validate({ query: inboxQuerySchema }), adminCommunicationsController.listInbox);
adminMessagesRouter.post('/messages', validate({ body: newDirectMessageSchema }), adminCommunicationsController.startDirectMessage);
adminMessagesRouter.delete('/messages', validate({ body: bulkDeleteMessagesSchema }), adminCommunicationsController.bulkDeleteInbox);

adminMessagesRouter.post('/messages/threads', validate({ body: createThreadSchema }), adminCommunicationsController.createThread);
adminMessagesRouter.get('/messages/threads', validate({ query: listThreadsQuerySchema }), adminCommunicationsController.listThreads);
adminMessagesRouter.get('/messages/threads/:id/messages', validate({ params: idParamSchema }), adminCommunicationsController.getThreadMessages);
adminMessagesRouter.post('/messages/threads/:id/messages', validate({ params: idParamSchema, body: postMessageSchema }), adminCommunicationsController.postMessage);
adminMessagesRouter.get('/messages/:id', validate({ params: idParamSchema }), adminCommunicationsController.getInboxDetail);
adminMessagesRouter.post('/messages/:id/reply', validate({ params: idParamSchema, body: replyMessageSchema }), adminCommunicationsController.replyToMessage);
adminMessagesRouter.delete('/messages/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteInbox);

export { adminMessagesRouter };
