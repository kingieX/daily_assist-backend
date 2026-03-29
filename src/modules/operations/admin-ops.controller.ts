import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { adminOpsService } from './admin-ops.service';

function currentUserId(req: Request): string {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return req.user.id;
}

const createReport = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.createReport(req.body, currentUserId(req));
  return sendSuccess(res, 201, 'Report created', result);
});

const listReports = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.listReports(req.query as any);
  return sendSuccess(res, 200, 'Reports retrieved', result);
});

const getReportById = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.getReportById(req.params.id as string);
  if (!result) throw new ApiError(404, 'Report not found');
  return sendSuccess(res, 200, 'Report retrieved', result);
});

const updateReportStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.updateReportStatus(req.params.id as string, req.body, currentUserId(req));
  return sendSuccess(res, 200, 'Report updated', result);
});


const deleteReport = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.deleteReport(req.params.id as string, currentUserId(req));
  return sendSuccess(res, 200, 'Report deleted', result);
});

const listSystemSettings = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminOpsService.listSystemSettings();
  return sendSuccess(res, 200, 'System settings retrieved', result);
});

const upsertSystemSetting = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.upsertSystemSetting(req.body, currentUserId(req));
  return sendSuccess(res, 200, 'System setting upserted', result);
});


const deleteSystemSetting = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.deleteSystemSetting(req.params.id as string, currentUserId(req));
  return sendSuccess(res, 200, 'System setting deleted', result);
});

const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.listAuditLogs(req.query as any);
  return sendSuccess(res, 200, 'Audit logs retrieved', result);
});

export const adminOpsController = {
  createReport,
  listReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  listSystemSettings,
  upsertSystemSetting,
  deleteSystemSetting,
  listAuditLogs
};
