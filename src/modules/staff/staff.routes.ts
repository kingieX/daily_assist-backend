import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/rbac.middleware';
import { sendSuccess } from '../../utils/api-response';
import { staffVisitsRouter } from '../visits/staff-visits.routes';

const staffRouter = Router();

staffRouter.use(authenticate, authorizeRoles(Role.STAFF));

staffRouter.get('/dashboard/summary', (_req, res) => {
  sendSuccess(res, 200, 'Staff dashboard placeholder', {
    message: 'Use /staff/visits/today and /staff/visits/history for workload details.'
  });
});

staffRouter.use('/visits', staffVisitsRouter);

export { staffRouter };
