import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminCommunicationsController } from './admin-communications.controller';
import {
  bulkDeleteMessagesSchema,
  createAnnouncementSchema,
  createThreadSchema,
  inboxQuerySchema,
  newDirectMessageSchema,
  idParamSchema,
  listAnnouncementsQuerySchema,
  listNotificationsQuerySchema,
  listThreadsQuerySchema,
  postMessageSchema,
  replyMessageSchema,
  updateNotificationPreferencesSchema
} from './communications.validation';

const adminCommunicationsRouter = Router();

adminCommunicationsRouter.get('/messages', validate({ query: inboxQuerySchema }), adminCommunicationsController.listInbox);
adminCommunicationsRouter.post('/messages', validate({ body: newDirectMessageSchema }), adminCommunicationsController.startDirectMessage);
adminCommunicationsRouter.delete('/messages', validate({ body: bulkDeleteMessagesSchema }), adminCommunicationsController.bulkDeleteInbox);

adminCommunicationsRouter.post('/messages/threads', validate({ body: createThreadSchema }), adminCommunicationsController.createThread);
adminCommunicationsRouter.get('/messages/threads', validate({ query: listThreadsQuerySchema }), adminCommunicationsController.listThreads);
adminCommunicationsRouter.get('/messages/threads/:id/messages', validate({ params: idParamSchema }), adminCommunicationsController.getThreadMessages);
adminCommunicationsRouter.post('/messages/threads/:id/messages', validate({ params: idParamSchema, body: postMessageSchema }), adminCommunicationsController.postMessage);
adminCommunicationsRouter.get('/messages/:id', validate({ params: idParamSchema }), adminCommunicationsController.getInboxDetail);
adminCommunicationsRouter.post('/messages/:id/reply', validate({ params: idParamSchema, body: replyMessageSchema }), adminCommunicationsController.replyToMessage);
adminCommunicationsRouter.delete('/messages/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteInbox);


adminCommunicationsRouter.get('/announcements', validate({ query: listAnnouncementsQuerySchema }), adminCommunicationsController.listAnnouncements);
adminCommunicationsRouter.post('/announcements', validate({ body: createAnnouncementSchema }), adminCommunicationsController.createAnnouncement);
adminCommunicationsRouter.delete('/announcements/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteAnnouncement);

adminCommunicationsRouter.get('/notifications/history', validate({ query: listNotificationsQuerySchema }), adminCommunicationsController.listNotifications);
adminCommunicationsRouter.delete('/notifications/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteNotification);
adminCommunicationsRouter.get('/notifications/preferences', adminCommunicationsController.getNotificationPreferences);
adminCommunicationsRouter.patch('/notifications/preferences', validate({ body: updateNotificationPreferencesSchema }), adminCommunicationsController.updateNotificationPreferences);

export { adminCommunicationsRouter };
