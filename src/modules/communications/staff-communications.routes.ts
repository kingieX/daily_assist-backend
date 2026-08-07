import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { staffCommunicationsController } from './staff-communications.controller';
import {
  idParamSchema,
  markAnnouncementReadSchema
} from './communications.validation';

const staffCommunicationsRouter = Router();


staffCommunicationsRouter.get('/announcements', staffCommunicationsController.listAnnouncements);
staffCommunicationsRouter.patch('/announcements/:id/read', validate({ params: idParamSchema, body: markAnnouncementReadSchema }), staffCommunicationsController.markAnnouncementRead);
staffCommunicationsRouter.post('/announcements/:id/acknowledge', validate({ params: idParamSchema }), staffCommunicationsController.acknowledgeAnnouncement);


export { staffCommunicationsRouter };
