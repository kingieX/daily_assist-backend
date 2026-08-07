import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminCommunicationsController } from './admin-communications.controller';
import {
  createAnnouncementSchema,
  idParamSchema,
  listAnnouncementsQuerySchema
} from './communications.validation';

const adminCommunicationsRouter = Router();

adminCommunicationsRouter.get('/announcements', validate({ query: listAnnouncementsQuerySchema }), adminCommunicationsController.listAnnouncements);
adminCommunicationsRouter.post('/announcements', validate({ body: createAnnouncementSchema }), adminCommunicationsController.createAnnouncement);
adminCommunicationsRouter.delete('/announcements/:id', validate({ params: idParamSchema }), adminCommunicationsController.deleteAnnouncement);


export { adminCommunicationsRouter };
