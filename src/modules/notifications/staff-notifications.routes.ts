import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { staffNotificationsController } from './staff-notifications.controller';
import {
  idParamSchema,
  listNotificationsQuerySchema,
  markNotificationReadSchema,
  updateNotificationPreferencesSchema
} from '../communications/communications.validation';

const staffNotificationsRouter = Router();

staffNotificationsRouter.get('/notifications', validate({ query: listNotificationsQuerySchema }), staffNotificationsController.listNotifications);
staffNotificationsRouter.get('/notifications/unread-count', staffNotificationsController.getUnreadCount);
staffNotificationsRouter.patch('/notifications/read-all', staffNotificationsController.markAllNotificationsRead);
staffNotificationsRouter.get('/notifications/preferences', staffNotificationsController.getNotificationPreferences);
staffNotificationsRouter.patch('/notifications/preferences', validate({ body: updateNotificationPreferencesSchema }), staffNotificationsController.updateNotificationPreferences);
staffNotificationsRouter.patch('/notifications/:id/read', validate({ params: idParamSchema, body: markNotificationReadSchema }), staffNotificationsController.markNotificationRead);
staffNotificationsRouter.delete('/notifications/:id', validate({ params: idParamSchema }), staffNotificationsController.deleteNotification);

export { staffNotificationsRouter };
