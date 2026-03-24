import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { publicService } from './public.service';

const getPackages = asyncHandler(async (_req: Request, res: Response) => {
  const packages = await publicService.listPackages();
  return sendSuccess(res, 200, 'Packages retrieved', packages);
});

const getPackageBySlug = asyncHandler(async (req: Request, res: Response) => {
  // req.params values are string | string[] in Express v5 types; route guarantees string
  const pkg = await publicService.getPackageBySlug(req.params.slug as string);
  return sendSuccess(res, 200, 'Package retrieved', pkg);
});

const getServices = asyncHandler(async (_req: Request, res: Response) => {
  const services = await publicService.listServices();
  return sendSuccess(res, 200, 'Services retrieved', services);
});

const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await publicService.submitBooking(req.body);
  return sendSuccess(res, 201, 'Booking request submitted successfully', result);
});

const createWorkerApplication = asyncHandler(async (req: Request, res: Response) => {
  const result = await publicService.submitWorkerApplication(req.body);
  return sendSuccess(res, 201, 'Application submitted successfully', result);
});

export const publicController = {
  getPackages,
  getPackageBySlug,
  getServices,
  createBooking,
  createWorkerApplication
};
