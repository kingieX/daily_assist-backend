import { Role } from '@prisma/client';
import { Router } from 'express';
import { adminVisitsRouter } from '../visits/admin-visits.routes';
import { adminCommunicationsRouter } from '../communications/admin-communications.routes';
import { adminOpsRouter } from '../operations/admin-ops.routes';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { adminController } from './admin.controller';
import {
  assignBookingSchema,
  bookingListQuerySchema,
  cancelBookingSchema,
  clientListQuerySchema,
  completeBookingSchema,
  convertApplicationSchema,
  createClientSchema,
  createStaffSchema,
  idParamSchema,
  recruitmentListQuerySchema,
  resetStaffPasswordSchema,
  staffListQuerySchema,
  updateBookingSchema,
  updateClientSchema,
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

adminRouter.get(
  '/bookings',
  validate({ query: bookingListQuerySchema }),
  adminController.listBookings
);
adminRouter.get('/bookings/:id', validate({ params: idParamSchema }), adminController.getBookingById);
adminRouter.post(
  '/bookings/:id/assign',
  validate({ params: idParamSchema, body: assignBookingSchema }),
  adminController.assignBooking
);
adminRouter.post(
  '/bookings/:id/cancel',
  validate({ params: idParamSchema, body: cancelBookingSchema }),
  adminController.cancelBooking
);
adminRouter.post(
  '/bookings/:id/complete',
  validate({ params: idParamSchema, body: completeBookingSchema }),
  adminController.completeBooking
);
adminRouter.patch(
  '/bookings/:id',
  validate({ params: idParamSchema, body: updateBookingSchema }),
  adminController.updateBooking
);

adminRouter.get('/clients', validate({ query: clientListQuerySchema }), adminController.listClients);
adminRouter.post('/clients', validate({ body: createClientSchema }), adminController.createClient);
adminRouter.get('/clients/:id', validate({ params: idParamSchema }), adminController.getClientById);
adminRouter.patch(
  '/clients/:id',
  validate({ params: idParamSchema, body: updateClientSchema }),
  adminController.updateClient
);
adminRouter.delete('/clients/:id', validate({ params: idParamSchema }), adminController.deleteClient);

adminRouter.get('/staff', validate({ query: staffListQuerySchema }), adminController.listStaff);
adminRouter.post('/staff', validate({ body: createStaffSchema }), adminController.createStaff);
adminRouter.get('/staff/:id', validate({ params: idParamSchema }), adminController.getStaffById);
adminRouter.post(
  '/staff/:id/provision-credentials',
  validate({ params: idParamSchema }),
  adminController.provisionStaffCredentials
);
adminRouter.post(
  '/staff/:id/reset-password',
  validate({ params: idParamSchema, body: resetStaffPasswordSchema }),
  adminController.resetStaffPassword
);
adminRouter.patch(
  '/staff/:id',
  validate({ params: idParamSchema, body: updateStaffSchema }),
  adminController.updateStaff
);
adminRouter.delete('/staff/:id', validate({ params: idParamSchema }), adminController.deleteStaff);

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
