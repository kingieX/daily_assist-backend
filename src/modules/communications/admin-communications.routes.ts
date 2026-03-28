import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminCommunicationsController } from './admin-communications.controller';
import {
  createAnnouncementSchema,
  createThreadSchema,
  idParamSchema,
  listNotificationsQuerySchema,
  listThreadsQuerySchema,
  postMessageSchema,
  updateNotificationPreferencesSchema
} from './communications.validation';

const adminCommunicationsRouter = Router();

adminCommunicationsRouter.post('/messages/threads', validate({ body: createThreadSchema }), adminCommunicationsController.createThread);
adminCommunicationsRouter.get('/messages/threads', validate({ query: listThreadsQuerySchema }), adminCommunicationsController.listThreads);
adminCommunicationsRouter.get('/messages/threads/:id/messages', validate({ params: idParamSchema }), adminCommunicationsController.getThreadMessages);
adminCommunicationsRouter.post('/messages/threads/:id/messages', validate({ params: idParamSchema, body: postMessageSchema }), adminCommunicationsController.postMessage);
adminCommunicationsRouter.delete('/messages/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteMessage);

adminCommunicationsRouter.get('/announcements', adminCommunicationsController.listAnnouncements);
adminCommunicationsRouter.post('/announcements', validate({ body: createAnnouncementSchema }), adminCommunicationsController.createAnnouncement);
adminCommunicationsRouter.delete('/announcements/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteAnnouncement);

adminCommunicationsRouter.get('/notifications/history', validate({ query: listNotificationsQuerySchema }), adminCommunicationsController.listNotifications);
adminCommunicationsRouter.delete('/notifications/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteNotification);
adminCommunicationsRouter.get('/notifications/preferences', adminCommunicationsController.getNotificationPreferences);
adminCommunicationsRouter.patch('/notifications/preferences', validate({ body: updateNotificationPreferencesSchema }), adminCommunicationsController.updateNotificationPreferences);

export { adminCommunicationsRouter };
