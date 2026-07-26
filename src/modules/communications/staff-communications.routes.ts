import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { staffCommunicationsController } from './staff-communications.controller';
import {
  createThreadSchema,
  inboxQuerySchema,
  idParamSchema,
  listNotificationsQuerySchema,
  listThreadsQuerySchema,
  markAnnouncementReadSchema,
  markNotificationReadSchema,
  postMessageSchema,
  replyMessageSchema,
  updateNotificationPreferencesSchema
} from './communications.validation';

const staffCommunicationsRouter = Router();

staffCommunicationsRouter.get('/messages', validate({ query: inboxQuerySchema }), staffCommunicationsController.listInbox);

staffCommunicationsRouter.post('/messages/threads', validate({ body: createThreadSchema }), staffCommunicationsController.createThread);
staffCommunicationsRouter.get('/messages/threads', validate({ query: listThreadsQuerySchema }), staffCommunicationsController.listThreads);
staffCommunicationsRouter.get('/messages/threads/:id/messages', validate({ params: idParamSchema }), staffCommunicationsController.getThreadMessages);
staffCommunicationsRouter.post('/messages/threads/:id/messages', validate({ params: idParamSchema, body: postMessageSchema }), staffCommunicationsController.postMessage);
staffCommunicationsRouter.get('/messages/:id', validate({ params: idParamSchema }), staffCommunicationsController.getInboxDetail);
staffCommunicationsRouter.post('/messages/:id/reply', validate({ params: idParamSchema, body: replyMessageSchema }), staffCommunicationsController.replyToMessage);
staffCommunicationsRouter.delete('/messages/:id', validate({ params: idParamSchema }), staffCommunicationsController.deleteInbox);

staffCommunicationsRouter.get('/announcements', staffCommunicationsController.listAnnouncements);
staffCommunicationsRouter.patch('/announcements/:id/read', validate({ params: idParamSchema, body: markAnnouncementReadSchema }), staffCommunicationsController.markAnnouncementRead);
staffCommunicationsRouter.post('/announcements/:id/acknowledge', validate({ params: idParamSchema }), staffCommunicationsController.acknowledgeAnnouncement);

staffCommunicationsRouter.get('/notifications', validate({ query: listNotificationsQuerySchema }), staffCommunicationsController.listNotifications);
staffCommunicationsRouter.patch('/notifications/:id/read', validate({ params: idParamSchema, body: markNotificationReadSchema }), staffCommunicationsController.markNotificationRead);
staffCommunicationsRouter.get('/notifications/preferences', staffCommunicationsController.getNotificationPreferences);
staffCommunicationsRouter.patch('/notifications/preferences', validate({ body: updateNotificationPreferencesSchema }), staffCommunicationsController.updateNotificationPreferences);

export { staffCommunicationsRouter };
