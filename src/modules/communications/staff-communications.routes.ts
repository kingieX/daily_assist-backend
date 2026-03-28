import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { staffCommunicationsController } from './staff-communications.controller';
import {
  idParamSchema,
  listNotificationsQuerySchema,
  listThreadsQuerySchema,
  markNotificationReadSchema,
  postMessageSchema
} from './communications.validation';

const staffCommunicationsRouter = Router();

staffCommunicationsRouter.get('/messages/threads', validate({ query: listThreadsQuerySchema }), staffCommunicationsController.listThreads);
staffCommunicationsRouter.get('/messages/threads/:id/messages', validate({ params: idParamSchema }), staffCommunicationsController.getThreadMessages);
staffCommunicationsRouter.post('/messages/threads/:id/messages', validate({ params: idParamSchema, body: postMessageSchema }), staffCommunicationsController.postMessage);
staffCommunicationsRouter.delete('/messages/:id', validate({ params: idParamSchema }), staffCommunicationsController.deleteMessage);

staffCommunicationsRouter.get('/announcements', staffCommunicationsController.listAnnouncements);
staffCommunicationsRouter.get('/notifications', validate({ query: listNotificationsQuerySchema }), staffCommunicationsController.listNotifications);
staffCommunicationsRouter.patch('/notifications/:id/read', validate({ params: idParamSchema, body: markNotificationReadSchema }), staffCommunicationsController.markNotificationRead);

export { staffCommunicationsRouter };
