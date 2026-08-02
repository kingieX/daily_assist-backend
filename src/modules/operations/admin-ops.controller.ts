import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { adminOpsService } from './admin-ops.service';

function currentUserId(req: Request): string {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return req.user.id;
}

const listReports = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.listReports(req.query as any);
  return sendSuccess(res, 200, 'Reports retrieved', result);
});

const listReportFilters = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminOpsService.listReportFilters();
  return sendSuccess(res, 200, 'Report filters retrieved', result);
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

const exportReports = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminOpsService.exportReports(req.query as any);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  return res.status(200).send(result.body);
});

export const adminOpsController = {
  listReports,
  listReportFilters,
  getReportById,
  updateReportStatus,
  exportReports
};
