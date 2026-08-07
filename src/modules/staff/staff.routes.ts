import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/rbac.middleware';
import { staffController } from './staff.controller';
import { staffVisitsRouter } from '../visits/staff-visits.routes';
import { staffCommunicationsRouter } from '../communications/staff-communications.routes';
import { staffMessagesRouter } from '../messages/staff-messages.routes';
import { staffNotificationsRouter } from '../notifications/staff-notifications.routes';

const staffRouter = Router();

staffRouter.use(authenticate, authorizeRoles(Role.STAFF));

staffRouter.get('/profile', staffController.getProfile);

staffRouter.get('/dashboard/summary', staffController.getDashboardSummary);
staffRouter.get('/alerts', staffController.listAlerts);
staffRouter.patch('/alerts/read-all', staffController.markAllAlertsRead);
staffRouter.patch('/alerts/:id/read', staffController.markAlertRead);

staffRouter.use('/visits', staffVisitsRouter);
staffRouter.use('/', staffMessagesRouter);
staffRouter.use('/', staffNotificationsRouter);
staffRouter.use('/', staffCommunicationsRouter);

export { staffRouter };
