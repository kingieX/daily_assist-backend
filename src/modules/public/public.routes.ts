import { Router } from 'express';
import { requireCaptcha } from '../../middlewares/captcha.middleware';
import { publicFormRateLimiter } from '../../middlewares/rate-limit.middleware';
import { uploadWorkerCv } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { publicController } from './public.controller';
import { createConsultationSchema, createPublicBookingSchema } from './public.validation';

const publicRouter = Router();

// ── Catalog reads (no auth, no rate limit) ─────────────────────────────────────
publicRouter.get('/packages', publicController.getPackages);
publicRouter.get('/packages/:slug', publicController.getPackageBySlug);
publicRouter.get('/services', publicController.getServices);

// ── Public form submissions (rate-limited: 10 / hour per IP) ──────────────────
const consultationMiddlewares = [
  publicFormRateLimiter,
  requireCaptcha,
  validate({ body: createConsultationSchema })
] as const;

publicRouter.post('/consultations', ...consultationMiddlewares, publicController.createConsultation);

publicRouter.post(
  '/bookings',
  publicFormRateLimiter,
  requireCaptcha,
  validate({ body: createPublicBookingSchema }),
  publicController.createBooking
);

const workerApplicationMiddlewares = [
  publicFormRateLimiter,
  requireCaptcha,
  uploadWorkerCv
] as const;

publicRouter.post('/worker-applications', ...workerApplicationMiddlewares, publicController.createWorkerApplication);

export { publicRouter };
