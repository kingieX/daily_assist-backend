import { Role } from '@prisma/client';
import { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { getRefreshTokenMaxAgeMs } from '../../utils/jwt';
import { authService } from './auth.service';

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: getRefreshTokenMaxAgeMs()
  };
}

function getRefreshTokenFromRequest(req: Request): string | undefined {
  const tokenFromBody =
    typeof req.body?.refreshToken === 'string' ? req.body.refreshToken.trim() : undefined;
  const tokenFromCookie =
    typeof req.cookies?.refreshToken === 'string' ? req.cookies.refreshToken.trim() : undefined;
  return tokenFromBody || tokenFromCookie;
}

const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.login({
    email: req.body.email,
    password: req.body.password,
    allowedRoles: [Role.ADMIN, Role.SUPER_ADMIN]
  });

  res.cookie('refreshToken', session.refreshToken, refreshCookieOptions());

  return sendSuccess(res, 200, 'Admin login successful', session);
});

const loginStaff = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.login({
    email: req.body.email,
    password: req.body.password,
    allowedRoles: [Role.STAFF]
  });

  res.cookie('refreshToken', session.refreshToken, refreshCookieOptions());

  return sendSuccess(res, 200, 'Staff login successful', session);
});

const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  const session = await authService.refreshSession(refreshToken);
  res.cookie('refreshToken', session.refreshToken, refreshCookieOptions());

  return sendSuccess(res, 200, 'Token refreshed successfully', session);
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  await authService.logout(refreshToken);
  res.clearCookie('refreshToken', {
    path: '/api/v1/auth',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  return sendSuccess(res, 200, 'Logout successful');
});

const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  return sendSuccess(res, 200, 'Current user fetched', req.user);
});

const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  // Always return 200 — don't reveal whether the email exists
  return sendSuccess(
    res,
    200,
    'If that email is registered and active, a password reset link has been sent.'
  );
});

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  return sendSuccess(res, 200, 'Password reset successful. Please log in with your new password.');
});

const adminCheck = asyncHandler(async (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Admin RBAC check passed');
});

export const authController = {
  loginAdmin,
  loginStaff,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
  adminCheck
};
