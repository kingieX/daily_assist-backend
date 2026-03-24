import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authRateLimiter } from '../../middlewares/rate-limit.middleware';
import { authorizeRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { authController } from './auth.controller';
import { forgotPasswordSchema, loginSchema, refreshSchema, resetPasswordSchema } from './auth.validation';

const authRouter = Router();

authRouter.post('/admin/login', authRateLimiter, validate({ body: loginSchema }), authController.loginAdmin);
authRouter.post('/staff/login', authRateLimiter, validate({ body: loginSchema }), authController.loginStaff);
authRouter.post('/refresh', authRateLimiter, validate({ body: refreshSchema }), authController.refresh);
authRouter.post('/logout', validate({ body: refreshSchema }), authController.logout);
authRouter.post('/forgot-password', authRateLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
authRouter.post('/reset-password', authRateLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

authRouter.get('/me', authenticate, authController.me);
authRouter.get('/admin-check', authenticate, authorizeRoles(Role.ADMIN, Role.SUPER_ADMIN), authController.adminCheck);

export { authRouter };
