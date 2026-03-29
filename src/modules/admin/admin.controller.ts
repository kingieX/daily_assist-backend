import { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { adminService } from './admin.service';

function getActorUserId(req: Request): string {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  return req.user.id;
}

const getDashboardSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await adminService.getDashboardSummary();
  return sendSuccess(res, 200, 'Dashboard summary retrieved', summary);
});

const getDashboardCharts = asyncHandler(async (_req: Request, res: Response) => {
  const charts = await adminService.getDashboardCharts();
  return sendSuccess(res, 200, 'Dashboard charts retrieved', charts);
});

const getDashboardAlerts = asyncHandler(async (_req: Request, res: Response) => {
  const alerts = await adminService.getDashboardAlerts();
  return sendSuccess(res, 200, 'Dashboard alerts retrieved', alerts);
});

const listBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await adminService.listBookings(req.query as any);
  return sendSuccess(res, 200, 'Bookings retrieved', bookings);
});

const getBookingById = asyncHandler(async (req: Request, res: Response) => {
  const booking = await adminService.getBookingById(req.params.id as string);
  return sendSuccess(res, 200, 'Booking retrieved', booking);
});

const assignBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await adminService.assignBooking(
    req.params.id as string,
    req.body,
    getActorUserId(req)
  );
  return sendSuccess(res, 200, 'Booking assigned successfully', booking);
});

const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await adminService.cancelBooking(req.params.id as string, req.body);
  return sendSuccess(res, 200, 'Booking cancelled successfully', booking);
});

const completeBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await adminService.completeBooking(req.params.id as string, req.body);
  return sendSuccess(res, 200, 'Booking completed successfully', booking);
});

const updateBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await adminService.updateBooking(req.params.id as string, req.body);
  return sendSuccess(res, 200, 'Booking updated successfully', booking);
});

const listClients = asyncHandler(async (req: Request, res: Response) => {
  const clients = await adminService.listClients(req.query as any);
  return sendSuccess(res, 200, 'Clients retrieved', clients);
});

const createClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await adminService.createClient(req.body);
  return sendSuccess(res, 201, 'Client created successfully', client);
});

const getClientById = asyncHandler(async (req: Request, res: Response) => {
  const client = await adminService.getClientById(req.params.id as string);
  return sendSuccess(res, 200, 'Client retrieved', client);
});

const updateClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await adminService.updateClient(req.params.id as string, req.body);
  return sendSuccess(res, 200, 'Client updated successfully', client);
});

const deleteClient = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteClient(req.params.id as string);
  return sendSuccess(res, 200, 'Client deleted successfully');
});

const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.listStaff(req.query as any);
  return sendSuccess(res, 200, 'Staff list retrieved', staff);
});

const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.createStaff(req.body);
  return sendSuccess(res, 201, 'Staff account created successfully', staff);
});

const getStaffById = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.getStaffById(req.params.id as string);
  return sendSuccess(res, 200, 'Staff retrieved', staff);
});


const provisionStaffCredentials = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.provisionStaffCredentials(req.params.id as string, getActorUserId(req));
  return sendSuccess(res, 200, 'Staff credentials provisioned successfully', result);
});

const resetStaffPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.resetStaffPassword(req.params.id as string, req.body);
  return sendSuccess(res, 200, 'Staff password reset successfully', result);
});

const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.updateStaff(req.params.id as string, req.body);
  return sendSuccess(res, 200, 'Staff updated successfully', staff);
});

const deleteStaff = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.deleteStaff(req.params.id as string);
  return sendSuccess(res, 200, 'Staff deactivated successfully', result);
});

const listRecruitmentApplications = asyncHandler(async (req: Request, res: Response) => {
  const applications = await adminService.listRecruitmentApplications(req.query as any);
  return sendSuccess(res, 200, 'Recruitment applications retrieved', applications);
});

const getRecruitmentApplicationById = asyncHandler(async (req: Request, res: Response) => {
  const application = await adminService.getRecruitmentApplicationById(req.params.id as string);
  return sendSuccess(res, 200, 'Recruitment application retrieved', application);
});

const updateRecruitmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const application = await adminService.updateRecruitmentStatus(
    req.params.id as string,
    req.body,
    getActorUserId(req)
  );
  return sendSuccess(res, 200, 'Recruitment status updated successfully', application);
});

const convertApplicationToStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.convertApplicationToStaff(
    req.params.id as string,
    req.body,
    getActorUserId(req)
  );
  return sendSuccess(res, 201, 'Applicant converted to staff successfully', staff);
});

export const adminController = {
  getDashboardSummary,
  getDashboardCharts,
  getDashboardAlerts,
  listBookings,
  getBookingById,
  assignBooking,
  cancelBooking,
  completeBooking,
  updateBooking,
  listClients,
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  listStaff,
  createStaff,
  getStaffById,
  provisionStaffCredentials,
  resetStaffPassword,
  updateStaff,
  deleteStaff,
  listRecruitmentApplications,
  getRecruitmentApplicationById,
  updateRecruitmentStatus,
  convertApplicationToStaff
};
