import { Role } from '@prisma/client';
import { Router } from 'express';
import { adminVisitsRouter } from '../visits/admin-visits.routes';
import { adminCommunicationsRouter } from '../communications/admin-communications.routes';
import { adminOpsRouter } from '../operations/admin-ops.routes';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { uploadClientProofOfAddress, uploadStaffFiles } from '../../middlewares/upload.middleware';
import { adminController } from './admin.controller';
import {
  bookingListQuerySchema,
  clientIdParamSchema,
  clientListQuerySchema,
  convertApplicationSchema,
  createClientSchema,
  createPackageSchema,
  createStaffSchema,
  idParamSchema,
  provisionStaffCredentialsSchema,
  packageListQuerySchema,
  recruitmentListQuerySchema,
  resetStaffPasswordSchema,
  staffIdParamSchema,
  staffListQuerySchema,
  updateBookingSchema,
  updateClientSchema,
  updatePackageSchema,
  updateRecruitmentStatusSchema,
  updateStaffSchema
} from './admin.validation';

const adminRouter = Router();

adminRouter.use(authenticate, authorizeRoles(Role.ADMIN, Role.SUPER_ADMIN));

adminRouter.get('/dashboard/summary', adminController.getDashboardSummary);
adminRouter.get('/dashboard/charts', adminController.getDashboardCharts);
adminRouter.get('/dashboard/alerts', adminController.getDashboardAlerts);

adminRouter.use('/visits', adminVisitsRouter);
adminRouter.use('/', adminCommunicationsRouter);
adminRouter.use('/', adminOpsRouter);

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

adminRouter.get('/staff', validate({ query: staffListQuerySchema }), adminController.listStaff);
adminRouter.post('/staff', uploadStaffFiles, validate({ body: createStaffSchema }), adminController.createStaff);
adminRouter.get('/staff/:id', validate({ params: staffIdParamSchema }), adminController.getStaffById);
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
adminRouter.patch(
  '/recruitment/applications/:id/status',
  validate({ params: idParamSchema, body: updateRecruitmentStatusSchema }),
  adminController.updateRecruitmentStatus
);
adminRouter.post(
  '/recruitment/applications/:id/convert-to-staff',
  validate({ params: idParamSchema, body: convertApplicationSchema }),
  adminController.convertApplicationToStaff
);

export { adminRouter };
