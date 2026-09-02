import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { staffMessagesController } from './staff-messages.controller';
import {
  createThreadSchema,
  inboxQuerySchema,
  idParamSchema,
  listThreadsQuerySchema,
  postMessageSchema,
  replyMessageSchema
} from '../communications/communications.validation';

const staffMessagesRouter = Router();

staffMessagesRouter.get('/messages', validate({ query: inboxQuerySchema }), staffMessagesController.listInbox);

staffMessagesRouter.post('/messages/threads', validate({ body: createThreadSchema }), staffMessagesController.createThread);
staffMessagesRouter.get('/messages/threads', validate({ query: listThreadsQuerySchema }), staffMessagesController.listThreads);
staffMessagesRouter.get('/messages/threads/:id/messages', validate({ params: idParamSchema }), staffMessagesController.getThreadMessages);
staffMessagesRouter.post('/messages/threads/:id/messages', validate({ params: idParamSchema, body: postMessageSchema }), staffMessagesController.postMessage);
staffMessagesRouter.delete('/messages/threads/:id', validate({ params: idParamSchema }), staffMessagesController.deleteThread);
staffMessagesRouter.delete('/messages/threads/:id/messages/:messageId', validate({ params: idParamSchema.extend({ messageId: idParamSchema.shape.id }) }), staffMessagesController.deleteMessage);
staffMessagesRouter.get('/messages/:id', validate({ params: idParamSchema }), staffMessagesController.getInboxDetail);
staffMessagesRouter.post('/messages/:id/reply', validate({ params: idParamSchema, body: replyMessageSchema }), staffMessagesController.replyToMessage);
staffMessagesRouter.delete('/messages/:id', validate({ params: idParamSchema }), staffMessagesController.deleteInbox);

export { staffMessagesRouter };
