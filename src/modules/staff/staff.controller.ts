import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { staffService } from './staff.service';

function getStaffUserId(req: Request): string {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  return req.user.id;
}

const listAlerts = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await staffService.listAlerts(getStaffUserId(req));
  return sendSuccess(res, 200, 'Staff alerts retrieved', alerts);
});

const markAlertRead = asyncHandler(async (req: Request, res: Response) => {
  const alert = await staffService.markAlertRead(req.params.id as string, getStaffUserId(req));
  return sendSuccess(res, 200, 'Staff alert marked read', alert);
});

const markAllAlertsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await staffService.markAllAlertsRead(getStaffUserId(req));
  return sendSuccess(res, 200, 'Staff alerts marked read', result);
});

const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await staffService.getProfile(getStaffUserId(req));
  return sendSuccess(res, 200, 'Staff profile retrieved', profile);
});

const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await staffService.getDashboardSummary(getStaffUserId(req));
  return sendSuccess(res, 200, 'Staff dashboard summary retrieved', summary);
});

export const staffController = {
  getDashboardSummary,
  getProfile,
  listAlerts,
  markAlertRead,
  markAllAlertsRead
};
