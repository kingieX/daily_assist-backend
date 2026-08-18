import { Request, Response } from 'express';
import path from 'path';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as adminSettingsService from './admin-settings.service';

function getAuthenticatedUser(req: Request) {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return req.user;
}

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
  const user = getAuthenticatedUser(req);
  const settings = await adminSettingsService.getNotificationSettings(user.id, user.role);
  return sendSuccess(res, 200, 'Notification settings retrieved', settings);
});

const updateNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const settings = await adminSettingsService.updateNotificationSettings(user.id, user.role, req.body);
  return sendSuccess(res, 200, 'Notification settings updated', settings);
});

const listSystemLog = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminSettingsService.listSystemLog(req.query as any);
  return sendSuccess(res, 200, 'System log retrieved', result);
});

const getSystemLogById = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminSettingsService.getSystemLogById(req.params.id as string);
  return sendSuccess(res, 200, 'System log retrieved', result);
});

const exportSystemLog = (format: 'csv' | 'pdf') => asyncHandler(async (req: Request, res: Response) => {
  const exported = await adminSettingsService.exportSystemLog({ ...(req.query as any), format });
  res.setHeader('Content-Type', exported.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
  return res.status(200).send(exported.body);
});

const changeAdminPassword = asyncHandler(async (req: Request, res: Response) => {
  await adminSettingsService.changeAdminPassword(getAuthenticatedUserId(req), req.body);
  return sendSuccess(res, 200, 'Password changed successfully');
});

const getRolesPermissions = asyncHandler(async (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Roles and permissions retrieved', adminSettingsService.getRolesPermissions());
});

const getMyRolesPermissions = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  return sendSuccess(res, 200, 'Current role permissions retrieved', adminSettingsService.getMyRolesPermissions(user.role));
});

const updateRolesPermissions = asyncHandler(async (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Roles and permissions updated', adminSettingsService.updateRolesPermissions(req.body));
});

export const adminSettingsController = {
  getAdminProfile,
  updateAdminProfile,
  deactivateAdminAccount,
  getNotificationSettings,
  updateNotificationSettings,
  changeAdminPassword,
  listSystemLog,
  getSystemLogById,
  exportSystemLog,
  getRolesPermissions,
  getMyRolesPermissions,
  updateRolesPermissions
};
