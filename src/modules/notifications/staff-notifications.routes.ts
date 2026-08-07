import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { staffCommunicationsController } from '../communications/staff-communications.controller';
import {
  idParamSchema,
  listNotificationsQuerySchema,
  markNotificationReadSchema,
  updateNotificationPreferencesSchema
} from '../communications/communications.validation';

const staffNotificationsRouter = Router();

staffNotificationsRouter.get('/notifications', validate({ query: listNotificationsQuerySchema }), staffCommunicationsController.listNotifications);
staffNotificationsRouter.patch('/notifications/:id/read', validate({ params: idParamSchema, body: markNotificationReadSchema }), staffCommunicationsController.markNotificationRead);
staffNotificationsRouter.get('/notifications/preferences', staffCommunicationsController.getNotificationPreferences);
staffNotificationsRouter.patch('/notifications/preferences', validate({ body: updateNotificationPreferencesSchema }), staffCommunicationsController.updateNotificationPreferences);

export { staffNotificationsRouter };
