import { Request, Response } from 'express';
import path from 'path';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as adminSettingsService from './admin-settings.service';

function getAuthenticatedUserId(req: Request): string {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  return req.user.id;
}

function uploadedAdminPhotoUrl(req: Request): string | undefined {
  const file = req.file as Express.Multer.File | undefined;
  return file ? `/uploads/staff/photos/${path.basename(file.path)}` : undefined;
}

const getAdminProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await adminSettingsService.getAdminProfile(getAuthenticatedUserId(req));
  return sendSuccess(res, 200, 'Admin profile retrieved', profile);
});

const updateAdminProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await adminSettingsService.updateAdminProfile(
    getAuthenticatedUserId(req),
    req.body,
    uploadedAdminPhotoUrl(req)
  );
  return sendSuccess(res, 200, 'Admin profile updated', profile);
});

const deactivateAdminAccount = asyncHandler(async (req: Request, res: Response) => {
  await adminSettingsService.deactivateAdminAccount(getAuthenticatedUserId(req));
  return res.status(204).send();
});

const getNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await adminSettingsService.getNotificationSettings(getAuthenticatedUserId(req));
  return sendSuccess(res, 200, 'Notification settings retrieved', settings);
});

const updateNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await adminSettingsService.updateNotificationSettings(getAuthenticatedUserId(req), req.body);
  return sendSuccess(res, 200, 'Notification settings updated', settings);
});

const listSystemLog = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminSettingsService.listSystemLog(req.query as any);
  return sendSuccess(res, 200, 'System log retrieved', result);
});

const exportSystemLog = asyncHandler(async (req: Request, res: Response) => {
  const exported = await adminSettingsService.exportSystemLog(req.query as any);
  res.setHeader('Content-Type', exported.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
  return res.status(200).send(exported.body);
});

const getRolesPermissions = asyncHandler(async (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Roles and permissions retrieved', adminSettingsService.getRolesPermissions());
});

export const adminSettingsController = {
  getAdminProfile,
  updateAdminProfile,
  deactivateAdminAccount,
  getNotificationSettings,
  updateNotificationSettings,
  listSystemLog,
  exportSystemLog,
  getRolesPermissions
};
