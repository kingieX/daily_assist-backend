import { Role } from '@prisma/client';
import { Router } from 'express';
import { adminVisitsRouter } from '../visits/admin-visits.routes';
import { adminCommunicationsRouter } from '../communications/admin-communications.routes';
import { adminMessagesRouter } from '../messages/admin-messages.routes';
import { adminNotificationsRouter } from '../notifications/admin-notifications.routes';
import { adminOpsRouter } from '../operations/admin-ops.routes';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { uploadAdminPhoto, uploadClientProofOfAddress, uploadStaffFiles } from '../../middlewares/upload.middleware';
import { adminController } from './admin.controller';
import {
  bookingListQuerySchema,
  dashboardReportsTodayQuerySchema,
  clientIdParamSchema,
  clientListQuerySchema,
  convertApplicationSchema,
  createClientSchema,
  createJobPostSchema,
  createPackageSchema,
  createStaffSchema,
  idParamSchema,
  provisionStaffCredentialsSchema,
  packageListQuerySchema,
  recruitmentListQuerySchema,
  resetStaffPasswordSchema,
  staffIdParamSchema,
  staffListQuerySchema,
  staffVisitHistoryQuerySchema,
  subAdminIdParamSchema,
  subAdminListQuerySchema,
  createSubAdminSchema,
  updateSubAdminSchema,
  provisionSubAdminCredentialsSchema,
  resetSubAdminPasswordSchema,
  updateBookingSchema,
  updateClientSchema,
  updateJobPostSchema,
  updatePackageSchema,
  updateStaffSchema
} from './admin.validation';
import { adminSettingsController } from './admin-settings.controller';
import {
  changePasswordSchema,
  deleteAdminAccountSchema,
  notificationSettingsSchema,
  systemLogExportQuerySchema,
  systemLogQuerySchema,
  updateAdminProfileSchema,
  rolesPermissionsUpdateSchema
} from './admin-settings.validation';

const adminRouter = Router();

adminRouter.use(authenticate, authorizeRoles(Role.ADMIN, Role.SUPER_ADMIN));

adminRouter.get('/profile', adminSettingsController.getAdminProfile);
adminRouter.patch(
  '/profile',
  uploadAdminPhoto,
  validate({ body: updateAdminProfileSchema }),
  adminSettingsController.updateAdminProfile
);
adminRouter.post('/change-password', validate({ body: changePasswordSchema }), adminSettingsController.changeAdminPassword);
adminRouter.delete('/account', validate({ body: deleteAdminAccountSchema }), adminSettingsController.deactivateAdminAccount);
adminRouter.get('/notification-settings', adminSettingsController.getNotificationSettings);
adminRouter.patch(
  '/notification-settings',
  validate({ body: notificationSettingsSchema }),
  adminSettingsController.updateNotificationSettings
);
adminRouter.get('/system-log', validate({ query: systemLogQuerySchema }), adminSettingsController.listSystemLog);
adminRouter.get('/system-log/export', validate({ query: systemLogExportQuerySchema }), adminSettingsController.exportSystemLog);
adminRouter.get('/roles-permissions', authorizeRoles(Role.SUPER_ADMIN), adminSettingsController.getRolesPermissions);
adminRouter.patch('/roles-permissions', authorizeRoles(Role.SUPER_ADMIN), validate({ body: rolesPermissionsUpdateSchema }), adminSettingsController.updateRolesPermissions);

adminRouter.get('/dashboard/summary', adminController.getDashboardSummary);
adminRouter.get('/dashboard/activity', adminController.getDashboardActivity);
adminRouter.get('/staff/schedule', adminController.getStaffSchedule);
adminRouter.get('/dashboard/alerts', adminController.getDashboardAlerts);
adminRouter.patch('/dashboard/alerts/:id/read', validate({ params: idParamSchema }), adminController.markDashboardAlertRead);
adminRouter.patch('/dashboard/alerts/read-all', adminController.markDashboardAlertsRead);
adminRouter.get('/dashboard/visits-today', adminController.getDashboardVisitsToday);
adminRouter.get('/dashboard/reports-today', validate({ query: dashboardReportsTodayQuerySchema }), adminController.getDashboardReportsToday);

adminRouter.use('/visits', adminVisitsRouter);
adminRouter.use('/', adminMessagesRouter);
adminRouter.use('/', adminNotificationsRouter);
adminRouter.use('/', adminCommunicationsRouter);
adminRouter.use('/', adminOpsRouter);


adminRouter.get('/job-posts', adminController.listJobPosts);
adminRouter.post('/job-posts', validate({ body: createJobPostSchema }), adminController.createJobPost);
adminRouter.patch(
  '/job-posts/:id',
  validate({ params: idParamSchema, body: updateJobPostSchema }),
  adminController.updateJobPost
);
adminRouter.delete('/job-posts/:id', validate({ params: idParamSchema }), adminController.deleteJobPost);

adminRouter.get('/packages', validate({ query: packageListQuerySchema }), adminController.listPackages);
adminRouter.post('/packages', validate({ body: createPackageSchema }), adminController.createPackage);
adminRouter.get('/packages/:id', validate({ params: idParamSchema }), adminController.getPackageById);
adminRouter.patch(
  '/packages/:id',
  validate({ params: idParamSchema, body: updatePackageSchema }),
  adminController.updatePackage
);
adminRouter.delete('/packages/:id', validate({ params: idParamSchema }), adminController.deletePackage);

adminRouter.get(
  '/bookings',
  validate({ query: bookingListQuerySchema }),
  adminController.listBookings
);
adminRouter.get('/bookings/:id', validate({ params: idParamSchema }), adminController.getBookingById);
adminRouter.patch(
  '/bookings/:id',
  validate({ params: idParamSchema, body: updateBookingSchema }),
  adminController.updateBooking
);

adminRouter.get('/clients', validate({ query: clientListQuerySchema }), adminController.listClients);
adminRouter.post('/clients', uploadClientProofOfAddress, validate({ body: createClientSchema }), adminController.createClient);
adminRouter.get('/clients/:id', validate({ params: clientIdParamSchema }), adminController.getClientById);
adminRouter.patch(
  '/clients/:id',
  uploadClientProofOfAddress,
  validate({ params: clientIdParamSchema, body: updateClientSchema }),
  adminController.updateClient
);
adminRouter.delete('/clients/:id', validate({ params: clientIdParamSchema }), adminController.deleteClient);
adminRouter.get('/clients/:id/history', validate({ params: clientIdParamSchema }), adminController.listClientHistory);


adminRouter.get('/sub-admin', authorizeRoles(Role.SUPER_ADMIN), validate({ query: subAdminListQuerySchema }), adminController.listSubAdmins);
adminRouter.post('/sub-admin', authorizeRoles(Role.SUPER_ADMIN), validate({ body: createSubAdminSchema }), adminController.createSubAdmin);
adminRouter.get('/sub-admin/:id', authorizeRoles(Role.SUPER_ADMIN), validate({ params: subAdminIdParamSchema }), adminController.getSubAdminById);
adminRouter.patch('/sub-admin/:id', authorizeRoles(Role.SUPER_ADMIN), validate({ params: subAdminIdParamSchema, body: updateSubAdminSchema }), adminController.updateSubAdmin);
adminRouter.delete('/sub-admin/:id', authorizeRoles(Role.SUPER_ADMIN), validate({ params: subAdminIdParamSchema }), adminController.deleteSubAdmin);
adminRouter.post('/sub-admin/:id/provision-credentials', authorizeRoles(Role.SUPER_ADMIN), validate({ params: subAdminIdParamSchema, body: provisionSubAdminCredentialsSchema }), adminController.provisionSubAdminCredentials);
adminRouter.get('/sub-admin/:id/credentials', authorizeRoles(Role.SUPER_ADMIN), validate({ params: subAdminIdParamSchema }), adminController.getSubAdminCredentials);
adminRouter.post('/sub-admin/:id/reset-password', authorizeRoles(Role.SUPER_ADMIN), validate({ params: subAdminIdParamSchema, body: resetSubAdminPasswordSchema }), adminController.resetSubAdminPassword);

adminRouter.get('/staff', validate({ query: staffListQuerySchema }), adminController.listStaff);
adminRouter.post('/staff', uploadStaffFiles, validate({ body: createStaffSchema }), adminController.createStaff);
adminRouter.get('/staff/:id', validate({ params: staffIdParamSchema }), adminController.getStaffById);
adminRouter.get(
  '/staff/:id/visits/history',
  validate({ params: staffIdParamSchema, query: staffVisitHistoryQuerySchema }),
  adminController.listStaffVisitHistory
);
adminRouter.get('/staff/:id/info-card', validate({ params: staffIdParamSchema }), adminController.getStaffInfoCard);
adminRouter.get('/staff/:id/visits', validate({ params: staffIdParamSchema }), adminController.listStaffVisits);
adminRouter.get('/staff/:id/credentials', validate({ params: staffIdParamSchema }), adminController.getStaffCredentials);
adminRouter.post(
  '/staff/:id/provision-credentials',
  validate({ params: staffIdParamSchema, body: provisionStaffCredentialsSchema }),
  adminController.provisionStaffCredentials
);
adminRouter.post(
  '/staff/:id/reset-password',
  validate({ params: staffIdParamSchema, body: resetStaffPasswordSchema }),
  adminController.resetStaffPassword
);
adminRouter.patch(
  '/staff/:id',
  uploadStaffFiles,
  validate({ params: staffIdParamSchema, body: updateStaffSchema }),
  adminController.updateStaff
);
adminRouter.delete('/staff/:id', validate({ params: staffIdParamSchema }), adminController.deleteStaff);

adminRouter.get(
  '/recruitment/applications',
  validate({ query: recruitmentListQuerySchema }),
  adminController.listRecruitmentApplications
);
adminRouter.get(
  '/recruitment/applications/:id',
  validate({ params: idParamSchema }),
  adminController.getRecruitmentApplicationById
);
adminRouter.delete(
  '/recruitment/applications/:id',
  validate({ params: idParamSchema }),
  adminController.deleteRecruitmentApplication
);
adminRouter.post(
  '/recruitment/applications/:id/convert-to-staff',
  uploadStaffFiles,
  validate({ params: idParamSchema, body: convertApplicationSchema }),
  adminController.convertApplicationToStaff
);

export { adminRouter };
