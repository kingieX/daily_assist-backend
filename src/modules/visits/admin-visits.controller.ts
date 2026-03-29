import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { visitService } from './visit.service';

function actorUserId(req: Request): string {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return req.user.id;
}

const listVisits = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitService.listAdminVisits(req.query as any);
  return sendSuccess(res, 200, 'Visits retrieved', result);
});

const getVisitById = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitService.getVisitById(req.params.id as string);
  return sendSuccess(res, 200, 'Visit retrieved', result);
});

const createVisit = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitService.createVisit(req.body, actorUserId(req));
  return sendSuccess(res, 201, 'Visit created successfully', result);
});

const updateVisit = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitService.updateVisit(req.params.id as string, req.body, actorUserId(req));
  return sendSuccess(res, 200, 'Visit updated successfully', result);
});

const reassignVisit = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitService.reassignVisit(req.params.id as string, req.body, actorUserId(req));
  return sendSuccess(res, 200, 'Visit reassigned successfully', result);
});

const cancelVisit = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitService.cancelVisit(req.params.id as string, req.body, actorUserId(req));
  return sendSuccess(res, 200, 'Visit cancelled successfully', result);
});

export const adminVisitsController = {
  listVisits,
  getVisitById,
  createVisit,
  updateVisit,
  reassignVisit,
  cancelVisit
};
