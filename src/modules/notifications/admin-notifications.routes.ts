import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminCommunicationsController } from '../communications/admin-communications.controller';
import {
  idParamSchema,
  listNotificationsQuerySchema,
  updateNotificationPreferencesSchema
} from '../communications/communications.validation';

const adminNotificationsRouter = Router();

adminNotificationsRouter.get('/notifications/history', validate({ query: listNotificationsQuerySchema }), adminCommunicationsController.listNotifications);
adminNotificationsRouter.delete('/notifications/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteNotification);
adminNotificationsRouter.get('/notifications/preferences', adminCommunicationsController.getNotificationPreferences);
adminNotificationsRouter.patch('/notifications/preferences', validate({ body: updateNotificationPreferencesSchema }), adminCommunicationsController.updateNotificationPreferences);

export { adminNotificationsRouter };
