import { Router } from 'express';
import { publicFormRateLimiter } from '../../middlewares/rate-limit.middleware';
import { uploadWorkerCv } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { publicController } from './public.controller';
import { createBookingSchema } from './public.validation';

const publicRouter = Router();

// ── Catalog reads (no auth, no rate limit) ─────────────────────────────────────
publicRouter.get('/packages', publicController.getPackages);
publicRouter.get('/packages/:slug', publicController.getPackageBySlug);
publicRouter.get('/services', publicController.getServices);

// ── Public form submissions (rate-limited: 10 / hour per IP) ──────────────────
publicRouter.post(
  '/bookings',
  publicFormRateLimiter,
  validate({ body: createBookingSchema }),
  publicController.createBooking
);

publicRouter.post(
  '/worker-applications',
  publicFormRateLimiter,
  uploadWorkerCv,
  publicController.createWorkerApplication
);

export { publicRouter };
