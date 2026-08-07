import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { staffCommunicationsController } from '../communications/staff-communications.controller';
import {
  createThreadSchema,
  inboxQuerySchema,
  idParamSchema,
  listThreadsQuerySchema,
  postMessageSchema,
  replyMessageSchema
} from '../communications/communications.validation';

const staffMessagesRouter = Router();

staffMessagesRouter.get('/messages', validate({ query: inboxQuerySchema }), staffCommunicationsController.listInbox);

staffMessagesRouter.post('/messages/threads', validate({ body: createThreadSchema }), staffCommunicationsController.createThread);
staffMessagesRouter.get('/messages/threads', validate({ query: listThreadsQuerySchema }), staffCommunicationsController.listThreads);
staffMessagesRouter.get('/messages/threads/:id/messages', validate({ params: idParamSchema }), staffCommunicationsController.getThreadMessages);
staffMessagesRouter.post('/messages/threads/:id/messages', validate({ params: idParamSchema, body: postMessageSchema }), staffCommunicationsController.postMessage);
staffMessagesRouter.get('/messages/:id', validate({ params: idParamSchema }), staffCommunicationsController.getInboxDetail);
staffMessagesRouter.post('/messages/:id/reply', validate({ params: idParamSchema, body: replyMessageSchema }), staffCommunicationsController.replyToMessage);
staffMessagesRouter.delete('/messages/:id', validate({ params: idParamSchema }), staffCommunicationsController.deleteInbox);

export { staffMessagesRouter };
