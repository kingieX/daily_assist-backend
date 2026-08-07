import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminNotificationsController } from './admin-notifications.controller';
import {
  idParamSchema,
  listNotificationsQuerySchema,
  markNotificationReadSchema,
  updateNotificationPreferencesSchema
} from '../communications/communications.validation';

const adminNotificationsRouter = Router();

adminNotificationsRouter.get('/notifications/history', validate({ query: listNotificationsQuerySchema }), adminNotificationsController.listNotifications);
adminNotificationsRouter.get('/notifications/unread-count', adminNotificationsController.getUnreadCount);
adminNotificationsRouter.patch('/notifications/read-all', adminNotificationsController.markAllNotificationsRead);
adminNotificationsRouter.get('/notifications/preferences', adminNotificationsController.getNotificationPreferences);
adminNotificationsRouter.patch('/notifications/preferences', validate({ body: updateNotificationPreferencesSchema }), adminNotificationsController.updateNotificationPreferences);
adminNotificationsRouter.patch('/notifications/:id/read', validate({ params: idParamSchema, body: markNotificationReadSchema }), adminNotificationsController.markNotificationRead);
adminNotificationsRouter.delete('/notifications/:id', validate({ params: idParamSchema }), adminNotificationsController.deleteNotification);

export { adminNotificationsRouter };
