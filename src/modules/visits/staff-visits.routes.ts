import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { staffVisitsController } from './staff-visits.controller';
import { checkOutVisitSchema, visitIdParamSchema } from './visit.validation';

const staffVisitsRouter = Router();

staffVisitsRouter.get('/today', staffVisitsController.getTodayVisits);
staffVisitsRouter.get('/history', staffVisitsController.getHistoryVisits);
staffVisitsRouter.get('/:id', validate({ params: visitIdParamSchema }), staffVisitsController.getVisitById);
staffVisitsRouter.post(
  '/:id/acknowledge',
  validate({ params: visitIdParamSchema }),
  staffVisitsController.acknowledgeVisit
);
staffVisitsRouter.post('/:id/check-in', validate({ params: visitIdParamSchema }), staffVisitsController.checkInVisit);
staffVisitsRouter.post(
  '/:id/check-out',
  validate({ params: visitIdParamSchema, body: checkOutVisitSchema }),
  staffVisitsController.checkOutVisit
);

export { staffVisitsRouter };
