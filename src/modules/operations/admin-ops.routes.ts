import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminOpsController } from './admin-ops.controller';
import { idParamSchema, reportExportQuerySchema, reportListQuerySchema, updateReportStatusSchema } from './admin-ops.validation';

const adminOpsRouter = Router();

adminOpsRouter.get('/reports', validate({ query: reportListQuerySchema }), adminOpsController.listReports);
adminOpsRouter.get('/reports/filters', adminOpsController.listReportFilters);
adminOpsRouter.get('/reports/export', validate({ query: reportExportQuerySchema }), adminOpsController.exportReports);
adminOpsRouter.get('/reports/:id', validate({ params: idParamSchema }), adminOpsController.getReportById);
adminOpsRouter.patch('/reports/:id/status', validate({ params: idParamSchema, body: updateReportStatusSchema }), adminOpsController.updateReportStatus);

export { adminOpsRouter };
