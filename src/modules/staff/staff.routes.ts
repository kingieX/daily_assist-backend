import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/rbac.middleware';
import { staffController } from './staff.controller';
import { staffVisitsRouter } from '../visits/staff-visits.routes';
import { staffCommunicationsRouter } from '../communications/staff-communications.routes';

const staffRouter = Router();

staffRouter.use(authenticate, authorizeRoles(Role.STAFF));

staffRouter.get('/dashboard/summary', staffController.getDashboardSummary);

staffRouter.use('/visits', staffVisitsRouter);
staffRouter.use('/', staffCommunicationsRouter);

export { staffRouter };
