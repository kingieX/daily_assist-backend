import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminCommunicationsController } from './admin-communications.controller';
import {
  createAnnouncementSchema,
  idParamSchema,
  listNotificationsQuerySchema,
  listThreadsQuerySchema,
  postMessageSchema
} from './communications.validation';

const adminCommunicationsRouter = Router();

adminCommunicationsRouter.get('/messages/threads', validate({ query: listThreadsQuerySchema }), adminCommunicationsController.listThreads);
adminCommunicationsRouter.get('/messages/threads/:id/messages', validate({ params: idParamSchema }), adminCommunicationsController.getThreadMessages);
adminCommunicationsRouter.post('/messages/threads/:id/messages', validate({ params: idParamSchema, body: postMessageSchema }), adminCommunicationsController.postMessage);
adminCommunicationsRouter.delete('/messages/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteMessage);

adminCommunicationsRouter.get('/announcements', adminCommunicationsController.listAnnouncements);
adminCommunicationsRouter.post('/announcements', validate({ body: createAnnouncementSchema }), adminCommunicationsController.createAnnouncement);
adminCommunicationsRouter.delete('/announcements/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteAnnouncement);

adminCommunicationsRouter.get('/notifications/history', validate({ query: listNotificationsQuerySchema }), adminCommunicationsController.listNotifications);
adminCommunicationsRouter.delete('/notifications/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteNotification);

export { adminCommunicationsRouter };
