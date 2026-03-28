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

const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await staffService.getDashboardSummary(getStaffUserId(req));
  return sendSuccess(res, 200, 'Staff dashboard summary retrieved', summary);
});

export const staffController = {
  getDashboardSummary
};
