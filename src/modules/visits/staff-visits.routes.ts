import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { staffVisitsController } from './staff-visits.controller';
import { checkOutVisitSchema, staffVisitListQuerySchema, visitIdParamSchema } from './visit.validation';

const staffVisitsRouter = Router();

staffVisitsRouter.get('/today', staffVisitsController.getTodayVisits);
staffVisitsRouter.get('/history', validate({ query: staffVisitListQuerySchema }), staffVisitsController.getHistoryVisits);
staffVisitsRouter.get('/future', staffVisitsController.getFutureVisits);
staffVisitsRouter.get('/', validate({ query: staffVisitListQuerySchema }), staffVisitsController.getVisits);
staffVisitsRouter.get('/:id', validate({ params: visitIdParamSchema }), staffVisitsController.getVisitById);
staffVisitsRouter.post('/:id/check-in', validate({ params: visitIdParamSchema }), staffVisitsController.checkInVisit);
staffVisitsRouter.post(
  '/:id/check-out',
  validate({ params: visitIdParamSchema, body: checkOutVisitSchema }),
  staffVisitsController.checkOutVisit
);

export { staffVisitsRouter };
