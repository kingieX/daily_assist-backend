import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { healthRouter } from '../modules/health/health.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { adminRouter } from '../modules/admin/admin.routes';
import { publicRouter } from '../modules/public/public.routes';
import { staffRouter } from '../modules/staff/staff.routes';
import { sendSuccess } from '../utils/api-response';

const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/admin', adminRouter);
v1Router.use('/public', publicRouter);
v1Router.use('/staff', staffRouter);

v1Router.get('/protected', authenticate, (req, res) => {
  sendSuccess(res, 200, 'Protected route accessed successfully', {
    user: req.user
  });
});

export { v1Router };
