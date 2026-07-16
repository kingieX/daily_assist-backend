import { promises as fs } from 'fs';
import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { formatValidationError } from '../../utils/validation-error';
import { publicService } from './public.service';
import { workerApplicationSchema } from './public.validation';

async function removeUploadedFile(filePath?: string): Promise<void> {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => undefined);
}

const getJobPosts = asyncHandler(async (_req: Request, res: Response) => {
  const posts = await publicService.listJobPosts();
  return sendSuccess(res, 200, 'Job posts retrieved', posts);
});

const getJobPostById = asyncHandler(async (req: Request, res: Response) => {
  const post = await publicService.getJobPostById(req.params.id as string);
  return sendSuccess(res, 200, 'Job post retrieved', post);
});

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

const createConsultation = asyncHandler(async (req: Request, res: Response) => {
  const result = await publicService.submitConsultation(req.body);
  return sendSuccess(res, 201, "Consultation request submitted successfully", result);
});

const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const result = await publicService.submitBooking(req.body);
  return sendSuccess(res, 201, "Booking submitted successfully", result);
});

const createWorkerApplication = asyncHandler(async (req: Request, res: Response) => {
  const parsedBody = workerApplicationSchema.safeParse(req.body);
  if (!parsedBody.success) {
    await removeUploadedFile(req.file?.path);
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', formatValidationError(parsedBody.error));
  }

  const cvFileUrl = req.file ? `/uploads/cv/${req.file.filename}` : undefined;

  try {
    const result = await publicService.submitWorkerApplication({
      ...parsedBody.data,
      cvFileUrl,
      cvFileName: req.file?.originalname,
      cvFileSize: req.file?.size
    });
    return sendSuccess(res, 201, 'Application submitted successfully', result);
  } catch (error) {
    await removeUploadedFile(req.file?.path);
    throw error;
  }
});

export const publicController = {
  getJobPosts,
  getJobPostById,
  getPackages,
  getPackageBySlug,
  getServices,
  createConsultation,
  createBooking,
  createWorkerApplication
};
