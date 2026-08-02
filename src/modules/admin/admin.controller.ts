import { Request, Response } from 'express';
import path from 'path';
import { ApiError } from '../../utils/api-error';
import { sendSuccess } from '../../utils/api-response';
import { asyncHandler } from '../../utils/async-handler';
import { adminService } from './admin.service';



function clientProofUrl(req: Request): { proofOfAddressUrl?: string } {
  const file = req.file as Express.Multer.File | undefined;
  return file ? { proofOfAddressUrl: `/uploads/clients/proof-of-address/${path.basename(file.path)}` } : {};
}

function staffUploadUrls(req: Request): { photoUrl?: string; cvFileUrl?: string } {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const photo = files?.photo?.[0] ?? files?.image?.[0];
  const cv = files?.cv?.[0];
  return {
    ...(photo ? { photoUrl: `/uploads/staff/photos/${path.basename(photo.path)}` } : {}),
    ...(cv ? { cvFileUrl: `/uploads/staff/cv/${path.basename(cv.path)}` } : {})
  };
}

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

const getDashboardActivity = asyncHandler(async (_req: Request, res: Response) => {
  const activity = await adminService.getDashboardActivity();
  return sendSuccess(res, 200, 'Dashboard activity retrieved', activity);
});

const getStaffSchedule = asyncHandler(async (_req: Request, res: Response) => {
  const schedule = await adminService.getStaffSchedule();
  return sendSuccess(res, 200, 'Staff schedule retrieved', schedule);
});

const getDashboardVisitsToday = asyncHandler(async (_req: Request, res: Response) => {
  const visits = await adminService.getDashboardVisitsToday();
  return sendSuccess(res, 200, 'Dashboard visits today retrieved', visits);
});

const getDashboardReportsToday = asyncHandler(async (req: Request, res: Response) => {
  const reports = await adminService.getDashboardReportsToday(req.query as any);
  return sendSuccess(res, 200, 'Dashboard reports today retrieved', reports);
});

const getDashboardAlerts = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await adminService.getDashboardAlerts(getActorUserId(req));
  return sendSuccess(res, 200, 'Dashboard alerts retrieved', alerts);
});

const markDashboardAlertRead = asyncHandler(async (req: Request, res: Response) => {
  const alert = await adminService.markDashboardAlertRead(req.params.id as string, getActorUserId(req));
  return sendSuccess(res, 200, 'Dashboard alert marked read', alert);
});

const markDashboardAlertsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.markDashboardAlertsRead(getActorUserId(req));
  return sendSuccess(res, 200, 'Dashboard alerts marked read', result);
});

const listJobPosts = asyncHandler(async (_req: Request, res: Response) => {
  const posts = await adminService.listJobPosts();
  return sendSuccess(res, 200, 'Job posts retrieved', posts);
});

const createJobPost = asyncHandler(async (req: Request, res: Response) => {
  const post = await adminService.createJobPost(req.body);
  return sendSuccess(res, 201, 'Job post created successfully', post);
});

const updateJobPost = asyncHandler(async (req: Request, res: Response) => {
  const post = await adminService.updateJobPost(req.params.id as string, req.body);
  return sendSuccess(res, 200, 'Job post updated successfully', post);
});

const deleteJobPost = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteJobPost(req.params.id as string);
  return res.status(204).send();
});

const listPackages = asyncHandler(async (req: Request, res: Response) => {
  const packages = await adminService.listPackages(req.query as any);
  return sendSuccess(res, 200, 'Packages retrieved', packages);
});

const createPackage = asyncHandler(async (req: Request, res: Response) => {
  const pkg = await adminService.createPackage(req.body);
  return sendSuccess(res, 201, 'Package created successfully', pkg);
});

const getPackageById = asyncHandler(async (req: Request, res: Response) => {
  const pkg = await adminService.getPackageById(req.params.id as string);
  return sendSuccess(res, 200, 'Package retrieved', pkg);
});

const updatePackage = asyncHandler(async (req: Request, res: Response) => {
  const pkg = await adminService.updatePackage(req.params.id as string, req.body);
  return sendSuccess(res, 200, 'Package updated successfully', pkg);
});

const deletePackage = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deletePackage(req.params.id as string);
  return sendSuccess(res, 200, 'Package deleted successfully');
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
    { ...req.body, ...staffUploadUrls(req) },
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
  const booking = await adminService.updateBooking(req.params.id as string, req.body, getActorUserId(req));
  return sendSuccess(res, 200, 'Booking updated successfully', booking);
});

const listClients = asyncHandler(async (req: Request, res: Response) => {
  const clients = await adminService.listClients(req.query as any);
  return sendSuccess(res, 200, 'Clients retrieved', clients);
});

const createClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await adminService.createClient({ ...req.body, ...clientProofUrl(req) });
  return sendSuccess(res, 201, 'Client created successfully', client);
});

const getClientById = asyncHandler(async (req: Request, res: Response) => {
  const client = await adminService.getClientById(req.params.id as string);
  return sendSuccess(res, 200, 'Client retrieved', client);
});

const updateClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await adminService.updateClient(req.params.id as string, { ...req.body, ...clientProofUrl(req) });
  return sendSuccess(res, 200, 'Client updated successfully', client);
});

const deleteClient = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteClient(req.params.id as string);
  return sendSuccess(res, 200, 'Client deleted successfully');
});


const listClientHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await adminService.listClientHistory(req.params.id as string);
  return sendSuccess(res, 200, 'Client history retrieved', history);
});

const listStaffVisits = asyncHandler(async (req: Request, res: Response) => {
  const visits = await adminService.listStaffVisits(req.params.id as string);
  return sendSuccess(res, 200, 'Staff visits retrieved', visits);
});

const listStaffVisitHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await adminService.listStaffVisitHistory(req.params.id as string, req.query as any);
  return sendSuccess(res, 200, 'Staff visit history retrieved', history);
});

const getStaffInfoCard = asyncHandler(async (req: Request, res: Response) => {
  const infoCard = await adminService.getStaffInfoCard(req.params.id as string);
  return sendSuccess(res, 200, 'Staff info card retrieved', infoCard);
});

const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.listStaff(req.query as any);
  return sendSuccess(res, 200, 'Staff list retrieved', staff);
});

const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.createStaff({ ...req.body, ...staffUploadUrls(req) });
  return sendSuccess(res, 201, 'Staff account created successfully', staff);
});

const getStaffById = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.getStaffById(req.params.id as string);
  return sendSuccess(res, 200, 'Staff retrieved', staff);
});


const provisionStaffCredentials = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.provisionStaffCredentials(req.params.id as string, req.body, getActorUserId(req));
  return sendSuccess(res, 200, 'Staff credentials provisioned successfully', result);
});

const getStaffCredentials = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getStaffCredentials(req.params.id as string);
  return sendSuccess(res, 200, 'Staff credentials retrieved successfully', result);
});

const resetStaffPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.resetStaffPassword(req.params.id as string, req.body);
  return sendSuccess(res, 200, 'Staff password reset successfully', result);
});

const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.updateStaff(req.params.id as string, { ...req.body, ...staffUploadUrls(req) });
  return sendSuccess(res, 200, 'Staff updated successfully', staff);
});

const deleteStaff = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.deleteStaff(req.params.id as string);
  return sendSuccess(res, 200, 'Staff deleted successfully', result);
});

const listRecruitmentApplications = asyncHandler(async (req: Request, res: Response) => {
  const applications = await adminService.listRecruitmentApplications(req.query as any);
  return sendSuccess(res, 200, 'Recruitment applications retrieved', applications);
});

const getRecruitmentApplicationById = asyncHandler(async (req: Request, res: Response) => {
  const application = await adminService.getRecruitmentApplicationById(req.params.id as string);
  return sendSuccess(res, 200, 'Recruitment application retrieved', application);
});


const deleteRecruitmentApplication = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteRecruitmentApplication(req.params.id as string);
  return res.status(204).send();
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
    { ...req.body, ...staffUploadUrls(req) },
    getActorUserId(req)
  );
  return sendSuccess(res, 201, 'Applicant converted to staff successfully', staff);
});

export const adminController = {
  getDashboardSummary,
  getDashboardActivity,
  getStaffSchedule,
  getDashboardAlerts,
  markDashboardAlertRead,
  markDashboardAlertsRead,
  getDashboardVisitsToday,
  getDashboardReportsToday,
  listJobPosts,
  createJobPost,
  updateJobPost,
  deleteJobPost,
  listPackages,
  createPackage,
  getPackageById,
  updatePackage,
  deletePackage,
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
  listClientHistory,
  listStaffVisits,
  listStaffVisitHistory,
  getStaffInfoCard,
  listStaff,
  createStaff,
  getStaffById,
  provisionStaffCredentials,
  getStaffCredentials,
  resetStaffPassword,
  updateStaff,
  deleteStaff,
  listRecruitmentApplications,
  getRecruitmentApplicationById,
  deleteRecruitmentApplication,
  updateRecruitmentStatus,
  convertApplicationToStaff
};
