import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  ApplicationStatus,
  BookingStatus,
  ClientSource,
  ClientStatus,
  Prisma,
  Role,
  UserStatus,
  VisitStatus
} from '@prisma/client';
import { sendPasswordResetEmail, sendStaffCredentialsEmail } from '../../config/mailer';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { hashValue } from '../../utils/hash';
import { hashPassword } from '../../utils/password';
import { recordAuditLog } from '../operations/audit-log.service';

import type {
  AssignBookingInput,
  BookingListQuery,
  CancelBookingInput,
  ClientListQuery,
  CompleteBookingInput,
  ConvertApplicationInput,
  CreateClientInput,
  CreatePackageInput,
  CreateStaffInput,
  PackageListQuery,
  ProvisionStaffCredentialsInput,
  RecruitmentListQuery,
  ResetStaffPasswordInput,
  StaffListQuery,
  UpdateBookingInput,
  UpdateClientInput,
  UpdatePackageInput,
  UpdateRecruitmentStatusInput,
  UpdateStaffInput
} from './admin.validation';

const db = prisma as any;

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}


function toEmailToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}

function generateTempPassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i += 1) {
    password += chars[bytes[i] % chars.length];
  }

  if (!/[A-Z]/.test(password)) password += 'A';
  if (!/[0-9]/.test(password)) password += '7';

  return password;
}

async function generateUniqueWorkEmail(firstName: string, lastName: string, currentUserId: string): Promise<string> {
  const localFirst = toEmailToken(firstName);
  const localLast = toEmailToken(lastName);
  const base = [localFirst, localLast].filter(Boolean).join('.') || localFirst || localLast || 'staff';

  let counter = 0;
  while (counter < 1000) {
    const localPart = counter === 0 ? base : `${base}${counter + 1}`;
    const candidate = `${localPart}@dailyassistuk.com`;

    const existing = await db.user.findFirst({
      where: {
        email: candidate,
        id: { not: currentUserId }
      },
      select: { id: true }
    });

    if (!existing) return candidate;

    counter += 1;
  }

  throw new ApiError(500, 'Unable to generate a unique work email for staff');
}


async function generateNextStaffCode(role: Role): Promise<string> {
  const baseNumber = role === Role.ADMIN || role === Role.SUPER_ADMIN ? 1 : 10;

  const usersWithCode = await db.user.findMany({
    where: { staffCode: { not: null } },
    select: { staffCode: true }
  });

  const parsed = usersWithCode
    .map((u: any) => u.staffCode)
    .filter((code: any): code is string => Boolean(code))
    .map((code: any) => Number(code.replace(/^DA/, '')))
    .filter((n: any) => Number.isFinite(n));

  const usedNumbers = new Set(parsed);
  let next = baseNumber;

  while (usedNumbers.has(next)) {
    next += 1;
  }

  return `DA${String(next).padStart(4, '0')}`;
}

function slugifyPackageName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `package-${Date.now()}`;
}

async function createUniquePackageSlug(name: string, excludeId?: string): Promise<string> {
  const baseSlug = slugifyPackageName(name);
  let slug = baseSlug;
  let suffix = 2;

  while (await db.package.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function packageDataFromInput(input: CreatePackageInput | UpdatePackageInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.price !== undefined) data.price = input.price;
  if (input.duration !== undefined) data.duration = input.duration;
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.tagline !== undefined) data.tagline = input.tagline;
  if (input.tagline !== undefined) data.description = input.tagline;
  if (input.features !== undefined) data.features = input.features;
  if (input.additionalCharge !== undefined) data.additionalCharge = input.additionalCharge ?? null;
  if (input.highlighted !== undefined) data.highlighted = input.highlighted;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;

  return data;
}

function buildPaginatedResult<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

async function listPackages(filters: PackageListQuery) {
  const page = filters.page;
  const limit = filters.limit;
  const skip = (page - 1) * limit;
  const where: Prisma.PackageWhereInput = {};

  if (filters.isActive !== undefined) where.isActive = filters.isActive;

  const [total, items] = await Promise.all([
    db.package.count({ where }),
    db.package.findMany({
      where,
      orderBy: [{ [filters.sortBy]: filters.sortOrder }, { id: 'asc' }],
      skip,
      take: limit
    })
  ]);

  return buildPaginatedResult(items, total, page, limit);
}

async function createPackage(input: CreatePackageInput) {
  const slug = await createUniquePackageSlug(input.name);

  return db.package.create({
    data: {
      ...packageDataFromInput(input),
      slug,
      priceMin: null,
      priceMax: null
    }
  });
}

async function getPackageById(id: string) {
  const pkg = await db.package.findUnique({ where: { id } });
  if (!pkg) throw new ApiError(404, 'Package not found');
  return pkg;
}

async function updatePackage(id: string, input: UpdatePackageInput) {
  await getPackageById(id);
  const data = packageDataFromInput(input);

  if (input.name !== undefined) {
    data.slug = await createUniquePackageSlug(input.name, id);
  }

  return db.package.update({ where: { id }, data });
}

async function deletePackage(id: string) {
  await getPackageById(id);
  await db.package.delete({ where: { id } });
}


const apiStatusToDb: Record<string, BookingStatus | 'CONTACTED'> = {
  pending: BookingStatus.REQUESTED,
  contacted: 'CONTACTED',
  assigned: BookingStatus.ASSIGNED,
  completed: BookingStatus.COMPLETED,
  cancelled: BookingStatus.CANCELLED
};

function dbStatusToApi(status: string): string {
  if (status === BookingStatus.REQUESTED) return 'pending';
  return status.toLowerCase();
}

function staffDisplayName(staff?: any): string | null {
  if (!staff) return null;
  const profile = staff.staffProfile;
  const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() : '';
  return name || staff.email || null;
}

function dateOnly(value?: Date | string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function planSnapshot(booking: any): any {
  return booking.selectedPlanSnapshot && typeof booking.selectedPlanSnapshot === 'object' ? booking.selectedPlanSnapshot : {};
}

function serializeBookingDetail(booking: any) {
  const clientName = [booking.client?.firstName, booking.client?.lastName].filter(Boolean).join(' ').trim();
  const snapshot = planSnapshot(booking);
  const selected = (booking.bookingServices ?? []).filter((s: any) => s.serviceType === 'SELECTED').map((s: any) => s.serviceNameSnapshot);
  const additional = (booking.bookingServices ?? []).filter((s: any) => s.serviceType === 'ADDITIONAL').map((s: any) => s.serviceNameSnapshot);
  return {
    id: booking.id,
    clientId: booking.clientId,
    status: dbStatusToApi(booking.status),
    clientName,
    email: booking.client?.email ?? '',
    phone: booking.client?.phone ?? '',
    address: booking.client?.address ?? '',
    date: dateOnly(booking.createdAt),
    emergencyContact: {
      name: booking.emergencyContactName ?? booking.client?.emergencyContactName ?? '',
      phone: booking.emergencyContactPhone ?? booking.client?.emergencyContactPhone ?? '',
      relationship: booking.emergencyContactRelationship ?? booking.client?.emergencyContactRelationship ?? ''
    },
    service: {
      name: snapshot.serviceName ?? snapshot.packageName ?? booking.package?.name ?? '',
      price: snapshot.servicePrice ?? '',
      frequency: snapshot.serviceFrequency ?? '',
      visitsPerWeek: snapshot.visitsPerWeek ?? '',
      transportMileage: snapshot.transportMileage ?? ''
    },
    selectedServiceTypes: selected.length ? selected : (snapshot.selectedServices ?? []),
    selectedAdditional: additional.length ? additional : (snapshot.additionalServices ?? []),
    preferredDays: snapshot.preferredDays ?? [],
    preferredTime: booking.preferredTime ?? '',
    preferredStartDate: dateOnly(booking.startDate),
    assignedStaffId: booking.assignedStaffId ?? null,
    assignedStaffName: staffDisplayName(booking.assignedStaff),
    pricingAdjustment: snapshot.pricingAdjustment ?? null,
    mileageFee: snapshot.mileageFee ?? null
  };
}

function serializeBookingListItem(booking: any) {
  const detail = serializeBookingDetail({ ...booking, bookingServices: booking.bookingServices ?? [] });
  return {
    id: detail.id,
    status: detail.status,
    clientName: detail.clientName,
    serviceRequest: detail.selectedServiceTypes[0] ?? detail.service.name,
    phone: detail.phone,
    address: detail.address,
    date: detail.date
  };
}

function combineDateAndTime(dateValue?: Date | string | null, timeValue?: string | null): Date {
  const date = dateValue ? dateOnly(dateValue) : dateOnly(new Date());
  const parsed = new Date(`${date}T09:00:00.000Z`);
  const match = timeValue?.match(/^(\d{1,2}):(\d{2})\s*(Am|Pm)$/i);
  if (match) {
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const suffix = match[3].toLowerCase();
    if (suffix === 'pm' && hours !== 12) hours += 12;
    if (suffix === 'am' && hours === 12) hours = 0;
    parsed.setUTCHours(hours, minutes, 0, 0);
  }
  return parsed;
}

const bookingInclude = {
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      emergencyContactRelationship: true
    }
  },
  package: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  bookingServices: { select: { serviceNameSnapshot: true, serviceType: true } },
  assignedStaff: {
    select: {
      id: true,
      staffCode: true,
      email: true,
      status: true,
      staffProfile: {
        select: {
          firstName: true,
          lastName: true,
          phone: true
        }
      }
    }
  }
} satisfies Prisma.BookingInclude;

async function getDashboardSummary() {
  const [requestedBookings, assignedBookings, activeClients, activeStaff, pendingApplications] =
    await Promise.all([
      db.booking.count({ where: { status: BookingStatus.REQUESTED } }),
      db.booking.count({ where: { status: BookingStatus.ASSIGNED } }),
      db.client.count({ where: { status: ClientStatus.ACTIVE } }),
      db.user.count({ where: { role: Role.STAFF, status: UserStatus.ACTIVE } }),
      db.workerApplication.count({ where: { status: ApplicationStatus.PENDING } })
    ]);

  return {
    requestedBookings,
    assignedBookings,
    activeClients,
    activeStaff,
    pendingApplications
  };
}

async function getDashboardCharts() {
  const [bookingsByStatus, applicationsByStatus] = await Promise.all([
    db.booking.groupBy({ by: ['status'], _count: { status: true } }),
    db.workerApplication.groupBy({ by: ['status'], _count: { status: true } })
  ]);

  return {
    bookingsByStatus: bookingsByStatus.map((entry: any) => ({
      status: entry.status,
      count: entry._count.status
    })),
    recruitmentByStatus: applicationsByStatus.map((entry: any) => ({
      status: entry.status,
      count: entry._count.status
    }))
  };
}

async function getDashboardAlerts() {
  const [unassigned, overdueRequested] = await Promise.all([
    db.booking.findMany({
      where: { status: BookingStatus.REQUESTED },
      orderBy: [{ createdAt: 'asc' }],
      take: 5,
      select: { id: true, createdAt: true, preferredDate: true }
    }),
    db.booking.findMany({
      where: {
        status: BookingStatus.REQUESTED,
        preferredDate: { lt: new Date() }
      },
      orderBy: [{ preferredDate: 'asc' }],
      take: 5,
      select: { id: true, preferredDate: true, createdAt: true }
    })
  ]);

  return {
    unassignedRequestedBookings: unassigned,
    overdueRequestedBookings: overdueRequested
  };
}

async function listBookings(filters: BookingListQuery) {
  const where: Prisma.BookingWhereInput = {};
  if (filters.status) where.status = (apiStatusToDb as any)[filters.status as any] ?? filters.status;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.assignedStaffId) where.assignedStaffId = filters.assignedStaffId;

  const page = filters.page;
  const limit = filters.limit;
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: [{ [filters.sortBy]: filters.sortOrder }, { id: 'asc' }],
      skip,
      take: limit
    })
  ]);

  return { data: items.map(serializeBookingListItem), items: items.map(serializeBookingListItem), pagination: buildPaginatedResult([], total, page, limit).pagination };
}

async function getBookingById(id: string) {
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      ...bookingInclude,
      bookingServices: {
        select: {
          id: true,
          serviceId: true,
          serviceNameSnapshot: true,
          serviceType: true,
          createdAt: true
        }
      }
    }
  });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  return serializeBookingDetail(booking);
}

async function assignBooking(id: string, input: AssignBookingInput, actorUserId: string) {
  const booking = await db.booking.findUnique({
    where: { id },
    select: { id: true, status: true }
  });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
    throw new ApiError(400, 'Booking cannot be assigned in its current status');
  }

  const staffUser = await db.user.findFirst({
    where: {
      id: input.staffId,
      role: Role.STAFF,
      status: UserStatus.ACTIVE
    },
    select: { id: true }
  });

  if (!staffUser) {
    throw new ApiError(404, 'Active staff user not found');
  }

  return db.booking.update({
    where: { id },
    data: {
      status: BookingStatus.ASSIGNED,
      assignedStaffId: input.staffId,
      assignedBy: actorUserId,
      assignedAt: new Date(),
      cancelledReason: null
    },
    include: bookingInclude
  });
}

async function cancelBooking(id: string, input: CancelBookingInput) {
  const booking = await db.booking.findUnique({
    where: { id },
    select: { id: true, status: true }
  });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new ApiError(400, 'Booking is already cancelled');
  }

  if (booking.status === BookingStatus.COMPLETED) {
    throw new ApiError(400, 'Completed booking cannot be cancelled');
  }

  return db.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledReason: input.reason
    },
    include: bookingInclude
  });
}

async function completeBooking(id: string, _input: CompleteBookingInput) {
  const booking = await db.booking.findUnique({
    where: { id },
    select: { id: true, status: true }
  });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new ApiError(400, 'Cancelled booking cannot be completed');
  }

  return db.booking.update({
    where: { id },
    data: {
      status: BookingStatus.COMPLETED
    },
    include: bookingInclude
  });
}

async function updateBooking(id: string, input: UpdateBookingInput, actorUserId?: string) {
  const booking = await db.booking.findUnique({ where: { id }, include: { ...bookingInclude, bookingServices: true, visits: true } });
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const data: Prisma.BookingUpdateInput = {};
  if (input.status !== undefined) data.status = (apiStatusToDb as any)[input.status] ?? input.status;
  if (input.confirmedStartDate !== undefined) data.startDate = input.confirmedStartDate;
  if (input.confirmedTime !== undefined) data.preferredTime = input.confirmedTime;
  if (input.preferredDate !== undefined) data.preferredDate = input.preferredDate;
  if (input.preferredTime !== undefined) data.preferredTime = input.preferredTime;
  if (input.startDate !== undefined) data.startDate = input.startDate;
  if (input.specialMessage !== undefined) data.specialMessage = input.specialMessage;
  if (input.emergencyContactName !== undefined) data.emergencyContactName = input.emergencyContactName;
  if (input.emergencyContactPhone !== undefined) {
    data.emergencyContactPhone = input.emergencyContactPhone;
  }
  if (input.emergencyContactRelationship !== undefined) {
    data.emergencyContactRelationship = input.emergencyContactRelationship;
  }

  if (input.pricingAdjustment !== undefined || input.mileageFee !== undefined) {
    data.selectedPlanSnapshot = { ...planSnapshot(booking), ...(input.pricingAdjustment !== undefined ? { pricingAdjustment: input.pricingAdjustment } : {}), ...(input.mileageFee !== undefined ? { mileageFee: input.mileageFee } : {}) };
  }

  if (input.status === 'assigned') {
    if (booking.status === BookingStatus.ASSIGNED || booking.visits.length > 0) throw new ApiError(409, 'Booking is already assigned');
    if (!input.staffId) throw new ApiError(400, 'staffId is required when assigning a booking');
    const staffUser = await db.user.findFirst({ where: { id: input.staffId, role: Role.STAFF, status: UserStatus.ACTIVE }, select: { id: true } });
    if (!staffUser) throw new ApiError(404, 'Active staff user not found');
    (data as any).assignedStaffId = input.staffId;
    (data as any).assignedBy = actorUserId ?? null;
    data.assignedAt = new Date();
    const start = combineDateAndTime(input.confirmedStartDate ?? input.startDate ?? booking.startDate ?? booking.createdAt, input.confirmedTime ?? input.preferredTime ?? booking.preferredTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await db.$transaction(async (tx: any) => {
      await tx.booking.update({ where: { id }, data });
      await tx.visit.create({ data: { bookingId: id, staffId: input.staffId, scheduledStartAt: start, scheduledEndAt: end } });
    });
  } else if (input.status === 'cancelled') {
    await db.$transaction(async (tx: any) => {
      await tx.visit.deleteMany({ where: { bookingId: id } });
      await tx.booking.update({ where: { id }, data });
    });
  } else {
    await db.booking.update({ where: { id }, data });
  }

  return getBookingById(id);
}

function frontendClientSexToDbSex(sex?: string): string | null | undefined {
  if (sex === undefined) return undefined;
  if (sex === 'Male') return 'MALE';
  if (sex === 'Female') return 'FEMALE';
  if (sex === 'Prefer not to say') return 'PREFER_NOT_TO_SAY';
  return sex;
}

function dbClientSexToFrontendSex(sex?: string | null): string {
  if (sex === 'MALE') return 'Male';
  if (sex === 'FEMALE') return 'Female';
  return 'Prefer not to say';
}

function clientLookupWhere(id: string): any {
  return {
    OR: [{ id }, { clientCode: id }]
  };
}

async function generateNextClientCode(): Promise<string> {
  const clientsWithCode = await db.client.findMany({
    where: { clientCode: { not: null } },
    select: { clientCode: true }
  });

  const maxNumber = clientsWithCode
    .map((client: any) => client.clientCode)
    .filter((code: any): code is string => Boolean(code))
    .map((code: string) => Number(code.replace(/^CLT-?/, '')))
    .filter((n: number) => Number.isFinite(n))
    .reduce((max: number, current: number) => Math.max(max, current), 0);

  return `CLT-${String(maxNumber + 1).padStart(4, '0')}`;
}

function serializeClient(client: any) {
  const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  const documents = client.proofOfAddressUrl
    ? [
        {
          type: 'doc',
          title: 'Proof of address',
          date: client.updatedAt
            ? new Intl.DateTimeFormat('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(client.updatedAt))
            : '',
          size: '',
          url: client.proofOfAddressUrl
        }
      ]
    : [];

  return {
    id: client.clientCode ?? client.id,
    clientId: client.id,
    title: client.title ?? '',
    firstName: client.firstName,
    lastName: client.lastName,
    fullName,
    email: client.email ?? '',
    phone: client.phone,
    age: client.age ?? null,
    sex: dbClientSexToFrontendSex(client.sex),
    address: client.address ?? '',
    emergencyContactName: client.emergencyContactName ?? '',
    emergencyContactPhone: client.emergencyContactPhone ?? '',
    emergencyContactRelationship: client.emergencyContactRelationship ?? '',
    note: client.notes ?? '',
    joinDate: client.createdAt ? new Date(client.createdAt).toISOString().slice(0, 10) : '',
    proofOfAddress: client.proofOfAddressUrl ?? null,
    documents
  };
}

function buildClientData(input: CreateClientInput | UpdateClientInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title ?? null;
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.email !== undefined) data.email = input.email ? normalizeEmail(input.email) : null;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.age !== undefined) data.age = input.age;
  if (input.sex !== undefined) data.sex = frontendClientSexToDbSex(input.sex);
  if (input.address !== undefined) data.address = input.address;
  if (input.emergencyContactName !== undefined) data.emergencyContactName = input.emergencyContactName ?? null;
  if (input.emergencyContactPhone !== undefined) data.emergencyContactPhone = input.emergencyContactPhone ?? null;
  if (input.emergencyContactRelationship !== undefined) {
    data.emergencyContactRelationship = input.emergencyContactRelationship ?? null;
  }
  if (input.proofOfAddressUrl !== undefined) data.proofOfAddressUrl = input.proofOfAddressUrl;
  if (input.note !== undefined) data.notes = input.note ?? null;
  return data;
}

function visitStatusToFrontend(status: VisitStatus | string): 'completed' | 'pending' | 'cancelled' {
  if (status === VisitStatus.COMPLETED) return 'completed';
  if (status === VisitStatus.CANCELLED || status === VisitStatus.NO_SHOW) return 'cancelled';
  return 'pending';
}

function formatVisitTime(value?: Date | string | null): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value)).toLowerCase();
}

function serializeVisit(visit: any) {
  const client = visit.booking?.client;
  const staffProfile = visit.staff?.staffProfile;
  const clientName = client ? [client.firstName, client.lastName].filter(Boolean).join(' ').trim() : '';
  const staffName = staffProfile ? [staffProfile.firstName, staffProfile.lastName].filter(Boolean).join(' ').trim() : '';

  return {
    id: visit.id,
    clientId: client?.clientCode ?? client?.id ?? visit.booking?.clientId ?? '',
    clientUserId: client?.id ?? visit.booking?.clientId ?? '',
    clientName,
    staffId: visit.staff?.staffCode ?? visit.staffId,
    staffUserId: visit.staffId,
    staffName,
    date: visit.scheduledStartAt ? new Date(visit.scheduledStartAt).toISOString().slice(0, 10) : '',
    status: visitStatusToFrontend(visit.status),
    timeStart: formatVisitTime(visit.scheduledStartAt),
    timeEnd: formatVisitTime(visit.scheduledEndAt),
    address: client?.address ?? ''
  };
}

const visitHistoryInclude = {
  booking: {
    select: {
      clientId: true,
      client: {
        select: {
          id: true,
          clientCode: true,
          firstName: true,
          lastName: true,
          address: true
        }
      }
    }
  },
  staff: {
    select: {
      id: true,
      staffCode: true,
      staffProfile: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  }
};

async function listClients(filters: ClientListQuery = {}) {
  const where: Prisma.ClientWhereInput = {};
  if (filters.status) where.status = filters.status;

  const items = await db.client.findMany({
    where,
    orderBy: [{ [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc' }, { id: 'asc' }]
  });

  return items.map(serializeClient);
}

async function createClient(input: CreateClientInput) {
  const clientCode = await generateNextClientCode();
  const client = await db.client.create({
    data: {
      clientCode,
      ...buildClientData(input),
      source: ClientSource.ADMIN_CREATED
    }
  });

  return serializeClient(client);
}

async function getClientById(id: string) {
  const client = await db.client.findFirst({
    where: clientLookupWhere(id)
  });

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  return serializeClient(client);
}

async function updateClient(id: string, input: UpdateClientInput) {
  const existingClient = await db.client.findFirst({
    where: clientLookupWhere(id),
    select: { id: true }
  });

  if (!existingClient) {
    throw new ApiError(404, 'Client not found');
  }

  const data = buildClientData(input);

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, 'At least one valid field must be provided for update');
  }

  const client = await db.client.update({
    where: { id: existingClient.id },
    data
  });

  return serializeClient(client);
}

async function deleteClient(id: string) {
  const client = await db.client.findFirst({
    where: clientLookupWhere(id),
    select: {
      id: true,
      bookings: { select: { id: true } }
    }
  });

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  const bookingIds = client.bookings.map((booking: any) => booking.id);
  await db.$transaction(async (tx: any) => {
    if (bookingIds.length > 0) {
      await tx.visit.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    await tx.client.delete({ where: { id: client.id } });
  });
}

async function listClientHistory(id: string) {
  const client = await db.client.findFirst({ where: clientLookupWhere(id), select: { id: true } });
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  const visits = await db.visit.findMany({
    where: { booking: { clientId: client.id } },
    orderBy: { scheduledStartAt: 'desc' },
    include: visitHistoryInclude
  });

  return visits.map(serializeVisit);
}

async function listStaffVisits(id: string) {
  const staff = await db.user.findFirst({ where: staffLookupWhere(id), select: { id: true } });
  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  const visits = await db.visit.findMany({
    where: { staffId: staff.id },
    orderBy: { scheduledStartAt: 'desc' },
    include: visitHistoryInclude
  });

  return visits.map(serializeVisit);
}

type StaffInputWithUploads = CreateStaffInput | UpdateStaffInput;

function frontendStatusToUserStatus(status?: string): UserStatus | undefined {
  if (status === 'available') return UserStatus.ACTIVE;
  if (status === 'unavailable') return UserStatus.INACTIVE;
  if (status && Object.values(UserStatus).includes(status as UserStatus)) return status as UserStatus;
  return undefined;
}

function userStatusToFrontendStatus(status: UserStatus): 'available' | 'unavailable' {
  return status === UserStatus.INACTIVE ? 'unavailable' : 'available';
}

function frontendSexToDbSex(sex?: string): string | null | undefined {
  if (sex === undefined) return undefined;
  if (sex === 'Male') return 'MALE';
  if (sex === 'Female') return 'FEMALE';
  if (sex === 'Prefer not to say') return 'PREFER_NOT_TO_SAY';
  return sex;
}

function dbSexToFrontendSex(sex?: string | null): string {
  if (sex === 'MALE') return 'Male';
  if (sex === 'FEMALE') return 'Female';
  return 'Prefer not to say';
}

function vehicleToOwnsCar(vehicle?: string): boolean | undefined {
  if (vehicle === undefined) return undefined;
  return vehicle === 'Yes, owns a vehicle';
}

function ownsCarToVehicle(ownsCar?: boolean | null): string {
  return ownsCar ? 'Yes, owns a vehicle' : 'No vehicle';
}

function parseDob(value?: string): Date | null | undefined {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDob(profile: any): string {
  if (profile?.dobText) return profile.dobText;
  if (!profile?.dateOfBirth) return '';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(profile.dateOfBirth));
}

function staffLookupWhere(id: string): Prisma.UserWhereInput {
  return {
    role: Role.STAFF,
    OR: [{ id }, { staffCode: id }]
  };
}

function formatStaffDocumentDate(value?: Date | string | null): string {
  return value
    ? new Intl.DateTimeFormat('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value))
    : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadedFileSizeLabel(url?: string | null): string {
  if (!url?.startsWith('/uploads/')) return '';

  const uploadPath = path.resolve(process.cwd(), url.replace(/^\/+/, ''));
  if (!uploadPath.startsWith(path.resolve(process.cwd(), 'uploads'))) return '';

  try {
    return formatBytes(fs.statSync(uploadPath).size);
  } catch {
    return '';
  }
}

function buildStaffDocuments(profile: any) {
  const documents = [];
  const date = formatStaffDocumentDate(profile.updatedAt);

  if (profile.photoUrl) {
    documents.push({
      type: 'image',
      title: 'Photo',
      date,
      size: uploadedFileSizeLabel(profile.photoUrl),
      url: profile.photoUrl
    });
  }

  if (profile.cvFileUrl) {
    documents.push({
      type: 'doc',
      title: 'CV',
      date,
      size: uploadedFileSizeLabel(profile.cvFileUrl),
      url: profile.cvFileUrl
    });
  }

  return documents;
}

function serializeStaff(user: any) {
  const profile = user.staffProfile ?? {};
  const firstName = profile.firstName ?? '';
  const lastName = profile.lastName ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();

  return {
    id: user.staffCode ?? user.id,
    userId: user.id,
    firstName,
    lastName,
    name,
    email: user.email,
    phone: profile.phone ?? '',
    status: userStatusToFrontendStatus(user.status),
    photo: profile.photoUrl ?? null,
    role: profile.staffRoleLabel ?? 'Home-Help & Support Assistant',
    dob: formatDob(profile),
    sex: dbSexToFrontendSex(profile.sex),
    zone: profile.zone ?? '',
    vehicle: ownsCarToVehicle(profile.ownsCar),
    address: profile.address ?? '',
    documents: buildStaffDocuments(profile)
  };
}

function buildStaffProfileData(input: StaffInputWithUploads): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.dob !== undefined) {
    data.dobText = input.dob;
    data.dateOfBirth = parseDob(input.dob);
  }
  if (input.sex !== undefined) data.sex = frontendSexToDbSex(input.sex);
  if (input.zone !== undefined) data.zone = input.zone;
  if (input.vehicle !== undefined) data.ownsCar = vehicleToOwnsCar(input.vehicle);
  if (input.address !== undefined) data.address = input.address ?? null;
  if (input.photoUrl !== undefined) data.photoUrl = input.photoUrl;
  if (input.cvFileUrl !== undefined) data.cvFileUrl = input.cvFileUrl;
  if (input.role !== undefined) data.staffRoleLabel = input.role;
  return data;
}

async function listStaff(filters: StaffListQuery = {}) {
  const where: Prisma.UserWhereInput = {
    role: Role.STAFF,
    status: frontendStatusToUserStatus(filters.status as string | undefined)
  };

  const items = await db.user.findMany({
    where,
    orderBy: [{ [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      staffCode: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      staffProfile: true
    }
  });

  return items.map(serializeStaff);
}

async function createStaff(input: CreateStaffInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true }
  });

  if (existingUser) {
    throw new ApiError(409, 'Email address is already in use');
  }

  const passwordHash = await hashPassword(generateTempPassword());
  const staffCode = await generateNextStaffCode(Role.STAFF);

  const staff = await db.user.create({
    data: {
      email: normalizedEmail,
      staffCode,
      passwordHash,
      role: Role.STAFF,
      status: frontendStatusToUserStatus(input.status) ?? UserStatus.ACTIVE,
      staffProfile: {
        create: buildStaffProfileData(input)
      }
    },
    select: {
      id: true,
      staffCode: true,
      email: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      staffProfile: true
    }
  });

  return serializeStaff(staff);
}

async function getStaffById(id: string) {
  const staff = await db.user.findFirst({
    where: staffLookupWhere(id),
    select: {
      id: true,
      staffCode: true,
      email: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      staffProfile: true
    }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  return serializeStaff(staff);
}

async function provisionStaffCredentials(
  id: string,
  input: ProvisionStaffCredentialsInput,
  actorUserId: string
) {
  const staff = await (db.user as any).findFirst({
    where: staffLookupWhere(id),
    select: {
      id: true,
      staffCode: true,
      email: true,
      businessEmail: true,
      status: true,
      staffProfile: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  if (!staff.staffProfile) {
    throw new ApiError(400, 'Staff profile is incomplete and cannot provision credentials');
  }

  const requestedBusinessEmail = input.businessEmail
    ? normalizeEmail(input.businessEmail)
    : input.email
      ? normalizeEmail(input.email)
      : undefined;
  const nextBusinessEmail = requestedBusinessEmail
    ?? staff.businessEmail
    ?? await generateUniqueWorkEmail(staff.staffProfile.firstName, staff.staffProfile.lastName, staff.id);

  if (nextBusinessEmail !== staff.businessEmail) {
    const existingUser = await (db.user as any).findFirst({
      where: {
        id: { not: staff.id },
        OR: [{ email: nextBusinessEmail }, { businessEmail: nextBusinessEmail }]
      },
      select: { id: true }
    });

    if (existingUser) {
      throw new ApiError(409, 'Business email address is already in use');
    }
  }

  const password = input.password ?? generateTempPassword();
  const passwordHash = await hashPassword(password);

  await db.$transaction(async (tx: any) => {
    await tx.user.update({
      where: { id: staff.id },
      data: {
        businessEmail: nextBusinessEmail,
        dashboardPassword: password,
        passwordHash,
        status: staff.status === UserStatus.INACTIVE ? UserStatus.ACTIVE : staff.status
      }
    });

    await tx.refreshToken.updateMany({
      where: { userId: staff.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await tx.passwordResetToken.deleteMany({
      where: { userId: staff.id, usedAt: null }
    });
  });

  await sendStaffCredentialsEmail({
    to: staff.email,
    email: nextBusinessEmail,
    password
  });

  await recordAuditLog({
    actorUserId,
    action: 'UPDATE',
    entity: 'staff_credentials',
    entityId: staff.id,
    metadataJson: {
      primaryEmail: staff.email,
      businessEmail: nextBusinessEmail,
      businessEmailRegenerated: nextBusinessEmail !== staff.businessEmail,
      passwordProvidedByAdmin: Boolean(input.password),
      credentialsEmailSent: true,
      deliveryMode: 'smtp_direct_credentials'
    }
  });

  return {
    id: staff.staffCode ?? staff.id,
    userId: staff.id,
    primaryEmail: staff.email,
    businessEmail: nextBusinessEmail,
    password,
    credentialsProvisioned: true,
    credentialsEmailSent: true,
    passwordDelivery: 'direct_credentials' as const,
    emailRegenerated: nextBusinessEmail !== staff.businessEmail
  };
}

async function getStaffCredentials(id: string) {
  const staff = await (db.user as any).findFirst({
    where: staffLookupWhere(id),
    select: {
      id: true,
      staffCode: true,
      email: true,
      businessEmail: true,
      dashboardPassword: true
    }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  if (!staff.businessEmail || !staff.dashboardPassword) {
    throw new ApiError(404, 'Staff credentials have not been provisioned yet');
  }

  return {
    id: staff.staffCode ?? staff.id,
    userId: staff.id,
    primaryEmail: staff.email,
    businessEmail: staff.businessEmail,
    password: staff.dashboardPassword,
    credentialsProvisioned: true
  };
}

async function resetStaffPassword(id: string, input: ResetStaffPasswordInput) {
  const staff = await db.user.findFirst({
    where: staffLookupWhere(id),
    select: { id: true }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db.$transaction([
    db.user.update({ where: { id: staff.id }, data: { passwordHash } }),
    db.refreshToken.updateMany({
      where: { userId: staff.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);

  return { id: staff.id, passwordReset: true };
}

async function updateStaff(id: string, input: UpdateStaffInput) {
  const staff = await db.user.findFirst({
    where: staffLookupWhere(id),
    include: { staffProfile: true }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  const normalizedEmail = input.email ? normalizeEmail(input.email) : undefined;
  if (normalizedEmail && normalizedEmail !== staff.email) {
    const emailExists = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    });
    if (emailExists) {
      throw new ApiError(409, 'Email address is already in use');
    }
  }

  const userData: any = {};
  if (normalizedEmail !== undefined) userData.email = normalizedEmail;
  const nextStatus = frontendStatusToUserStatus(input.status);
  if (nextStatus !== undefined) userData.status = nextStatus;

  const profileData = buildStaffProfileData(input);
  if (Object.keys(profileData).length > 0) {
    userData.staffProfile = staff.staffProfile
      ? { update: profileData }
      : {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            ...profileData
          }
        };
  }

  if (Object.keys(userData).length === 0) {
    throw new ApiError(400, 'At least one valid field must be provided for update');
  }

  const updated = await db.user.update({
    where: { id: staff.id },
    data: userData,
    select: {
      id: true,
      staffCode: true,
      email: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      staffProfile: true
    }
  });

  return serializeStaff(updated);
}

async function deleteStaff(id: string) {
  const staff = await db.user.findFirst({
    where: staffLookupWhere(id),
    select: {
      id: true,
      staffCode: true
    }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  await db.$transaction(async (tx: any) => {
    const staffVisits = await tx.visit.findMany({
      where: { staffId: staff.id },
      select: { id: true }
    });
    const staffVisitIds = staffVisits.map((visit: { id: string }) => visit.id);

    if (staffVisitIds.length > 0) {
      await tx.visitEvent.deleteMany({ where: { visitId: { in: staffVisitIds } } });
      await tx.visit.deleteMany({ where: { id: { in: staffVisitIds } } });
    }

    const staffConversations = await tx.conversation.findMany({
      where: { staffId: staff.id },
      select: { id: true }
    });
    const staffConversationIds = staffConversations.map((conversation: { id: string }) => conversation.id);

    if (staffConversationIds.length > 0) {
      await tx.message.deleteMany({ where: { conversationId: { in: staffConversationIds } } });
      await tx.conversation.deleteMany({ where: { id: { in: staffConversationIds } } });
    }

    await tx.message.deleteMany({ where: { senderUserId: staff.id } });
    await tx.visitEvent.deleteMany({ where: { actorUserId: staff.id } });
    await tx.announcement.deleteMany({ where: { createdBy: staff.id } });
    await tx.booking.updateMany({ where: { assignedStaffId: staff.id }, data: { assignedStaffId: null, assignedAt: null } });
    await tx.booking.updateMany({ where: { assignedBy: staff.id }, data: { assignedBy: null } });
    await tx.report.deleteMany({ where: { createdBy: staff.id } });
    await tx.report.updateMany({ where: { updatedBy: staff.id }, data: { updatedBy: null } });
    await tx.systemSetting.updateMany({ where: { updatedBy: staff.id }, data: { updatedBy: null } });
    await tx.auditLog.updateMany({ where: { actorUserId: staff.id }, data: { actorUserId: null } });
    await tx.user.delete({ where: { id: staff.id } });
  });

  return {
    id: staff.staffCode ?? staff.id,
    userId: staff.id,
    deleted: true
  };
}

async function listRecruitmentApplications(filters: RecruitmentListQuery) {
  const page = filters.page;
  const limit = filters.limit;
  const skip = (page - 1) * limit;

  const where: Prisma.WorkerApplicationWhereInput = {
    status: filters.status
  };

  const [total, items] = await Promise.all([
    db.workerApplication.count({ where }),
    db.workerApplication.findMany({
      where,
      orderBy: [{ [filters.sortBy]: filters.sortOrder }, { id: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        cvFileUrl: true,
        status: true,
        reviewNotes: true,
        reviewedBy: true,
        createdAt: true,
        updatedAt: true,
        reviewer: {
          select: {
            id: true,
            email: true
          }
        }
      },
      skip,
      take: limit
    })
  ]);

  return buildPaginatedResult(items, total, page, limit);
}

async function getRecruitmentApplicationById(id: string) {
  const application = await db.workerApplication.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      cvFileUrl: true,
      status: true,
      reviewNotes: true,
      reviewedBy: true,
      createdAt: true,
      updatedAt: true,
      reviewer: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  if (!application) {
    throw new ApiError(404, 'Worker application not found');
  }

  return application;
}

async function updateRecruitmentStatus(
  id: string,
  input: UpdateRecruitmentStatusInput,
  actorUserId: string
) {
  const existingApplication = await db.workerApplication.findUnique({
    where: { id },
    select: { id: true, status: true }
  });

  if (!existingApplication) {
    throw new ApiError(404, 'Worker application not found');
  }

  if (existingApplication.status === ApplicationStatus.CONVERTED_TO_STAFF) {
    throw new ApiError(400, 'Converted application status cannot be changed');
  }

  const updateData: Prisma.WorkerApplicationUpdateInput = {
    status: input.status,
    reviewer: { connect: { id: actorUserId } }
  };

  if (input.reviewNotes !== undefined) {
    updateData.reviewNotes = input.reviewNotes;
  }

  return db.workerApplication.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      reviewNotes: true,
      reviewedBy: true,
      updatedAt: true
    }
  });
}

async function convertApplicationToStaff(
  id: string,
  input: ConvertApplicationInput,
  actorUserId: string
) {
  const application = await db.workerApplication.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true
    }
  });

  if (!application) {
    throw new ApiError(404, 'Worker application not found');
  }

  if (application.status === ApplicationStatus.CONVERTED_TO_STAFF) {
    throw new ApiError(400, 'Application has already been converted to staff');
  }

  if (application.status !== ApplicationStatus.APPROVED) {
    throw new ApiError(400, 'Only approved applications can be converted to staff');
  }

  const normalizedEmail = normalizeEmail(application.email);
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true }
  });

  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const staffCode = await generateNextStaffCode(Role.STAFF);

  return db.$transaction(async (tx: any) => {
    const staffUser = await tx.user.create({
      data: {
        email: normalizedEmail,
        staffCode,
        passwordHash,
        role: Role.STAFF,
        status: UserStatus.ACTIVE,
        staffProfile: {
          create: {
            firstName: application.firstName,
            lastName: application.lastName,
            phone: application.phone
          }
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        staffProfile: true
      }
    });

    await tx.workerApplication.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.CONVERTED_TO_STAFF,
        reviewer: { connect: { id: actorUserId } }
      }
    });

    return staffUser;
  });
}

export const adminService = {
  getDashboardSummary,
  getDashboardCharts,
  getDashboardAlerts,
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
  updateRecruitmentStatus,
  convertApplicationToStaff
};
