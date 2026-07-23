import { Request, Response } from 'express';
import path from 'path';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import * as svc from './admin-settings.service';

function userId(req: Request) { if (!req.user) throw new ApiError(401, 'Authentication required'); return req.user.id; }
function adminPhotoUrl(req: Request) { const file = req.file as Express.Multer.File | undefined; return file ? `/uploads/staff/photos/${path.basename(file.path)}` : undefined; }

export const adminSettingsController = {
  getAdminProfile: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Admin profile retrieved', await svc.getAdminProfile(userId(req)))),
  updateAdminProfile: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Admin profile updated', await svc.updateAdminProfile(userId(req), req.body, adminPhotoUrl(req)))),
  deactivateAdminAccount: asyncHandler(async (req, res) => { await svc.deactivateAdminAccount(userId(req)); return res.status(204).send(); }),
  getNotificationSettings: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Notification settings retrieved', await svc.getNotificationSettings(userId(req)))),
  updateNotificationSettings: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Notification settings updated', await svc.updateNotificationSettings(userId(req), req.body))),
  listSystemLog: asyncHandler(async (req, res) => sendSuccess(res, 200, 'System log retrieved', await svc.listSystemLog(req.query))),
  exportSystemLog: asyncHandler(async (req: Request, res: Response) => { const out = await svc.exportSystemLog(req.query); res.setHeader('Content-Type', out.contentType); res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`); return res.status(200).send(out.body); }),
  getRolesPermissions: asyncHandler(async (_req, res) => sendSuccess(res, 200, 'Roles and permissions retrieved', svc.getRolesPermissions()))
};
