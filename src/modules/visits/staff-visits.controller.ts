import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { visitService } from './visit.service';

function staffUserId(req: Request): string {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return req.user.id;
}

const getTodayVisits = asyncHandler(async (req: Request, res: Response) => {
  const visits = await visitService.listStaffTodayVisits(staffUserId(req));
  return sendSuccess(res, 200, 'Today visits retrieved', visits);
});

const getHistoryVisits = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const visits = await visitService.listStaffVisitHistory(staffUserId(req), page, limit);
  return sendSuccess(res, 200, 'Visit history retrieved', visits);
});

const getVisitById = asyncHandler(async (req: Request, res: Response) => {
  const visit = await visitService.getStaffVisitOrThrow(req.params.id as string, staffUserId(req));
  return sendSuccess(res, 200, 'Visit retrieved', visit);
});

const acknowledgeVisit = asyncHandler(async (req: Request, res: Response) => {
  const visit = await visitService.acknowledgeVisit(req.params.id as string, staffUserId(req));
  return sendSuccess(res, 200, 'Visit acknowledged successfully', visit);
});

const checkInVisit = asyncHandler(async (req: Request, res: Response) => {
  const visit = await visitService.checkInVisit(req.params.id as string, staffUserId(req));
  return sendSuccess(res, 200, 'Visit check-in successful', visit);
});

const checkOutVisit = asyncHandler(async (req: Request, res: Response) => {
  const visit = await visitService.checkOutVisit(req.params.id as string, staffUserId(req), req.body);
  return sendSuccess(res, 200, 'Visit check-out successful', visit);
});

export const staffVisitsController = {
  getTodayVisits,
  getHistoryVisits,
  getVisitById,
  acknowledgeVisit,
  checkInVisit,
  checkOutVisit
};
