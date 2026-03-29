import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { adminOpsController } from './admin-ops.controller';
import {
  auditLogQuerySchema,
  createReportSchema,
  idParamSchema,
  reportListQuerySchema,
  updateReportStatusSchema,
  upsertSystemSettingSchema
} from './admin-ops.validation';

const adminOpsRouter = Router();

adminOpsRouter.post('/reports', validate({ body: createReportSchema }), adminOpsController.createReport);
adminOpsRouter.get('/reports', validate({ query: reportListQuerySchema }), adminOpsController.listReports);
adminOpsRouter.get('/reports/:id', validate({ params: idParamSchema }), adminOpsController.getReportById);
adminOpsRouter.patch('/reports/:id/status', validate({ params: idParamSchema, body: updateReportStatusSchema }), adminOpsController.updateReportStatus);
adminOpsRouter.delete('/reports/:id', validate({ params: idParamSchema }), adminOpsController.deleteReport);

adminOpsRouter.get('/settings/system', adminOpsController.listSystemSettings);
adminOpsRouter.put('/settings/system', validate({ body: upsertSystemSettingSchema }), adminOpsController.upsertSystemSetting);
adminOpsRouter.delete('/settings/system/:id', validate({ params: idParamSchema }), adminOpsController.deleteSystemSetting);

adminOpsRouter.get('/audit-logs', validate({ query: auditLogQuerySchema }), adminOpsController.listAuditLogs);

export { adminOpsRouter };
