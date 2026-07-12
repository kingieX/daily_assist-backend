import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminVisitsController } from './admin-visits.controller';
import {
  adminVisitListQuerySchema,
  cancelVisitSchema,
  createVisitSchema,
  reassignVisitSchema,
  updateVisitSchema,
  visitIdParamSchema,
  staffIdParamSchema,
  staffTaskParamSchema
} from './visit.validation';

const adminVisitsRouter = Router();

adminVisitsRouter.get('/', validate({ query: adminVisitListQuerySchema }), adminVisitsController.listVisits);
adminVisitsRouter.get('/:staffId/tasks/:taskId', validate({ params: staffTaskParamSchema }), adminVisitsController.getStaffTask);
adminVisitsRouter.get('/:staffId', validate({ params: staffIdParamSchema }), adminVisitsController.getStaffWithTasks);
adminVisitsRouter.post('/', validate({ body: createVisitSchema }), adminVisitsController.createVisit);
adminVisitsRouter.patch(
  '/:id',
  validate({ params: visitIdParamSchema, body: updateVisitSchema }),
  adminVisitsController.updateVisit
);
adminVisitsRouter.post(
  '/:id/reassign',
  validate({ params: visitIdParamSchema, body: reassignVisitSchema }),
  adminVisitsController.reassignVisit
);
adminVisitsRouter.post(
  '/:id/cancel',
  validate({ params: visitIdParamSchema, body: cancelVisitSchema }),
  adminVisitsController.cancelVisit
);

export { adminVisitsRouter };
