import crypto from 'crypto';
import {
  ApplicationStatus,
  BookingStatus,
  ClientSource,
  ClientStatus,
  Prisma,
  Role,
  UserStatus
} from '@prisma/client';
import { sendPasswordResetEmail } from '../../config/mailer';
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

  const maxNumber = parsed.length ? Math.max(...parsed) : baseNumber - 1;
  const next = Math.max(baseNumber, maxNumber + 1);

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

const bookingInclude = {
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true
    }
  },
  package: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
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
  if (filters.status) where.status = filters.status;
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

  return buildPaginatedResult(items, total, page, limit);
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

  return booking;
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

async function updateBooking(id: string, input: UpdateBookingInput) {
  const booking = await db.booking.findUnique({ where: { id }, select: { id: true } });
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const data: Prisma.BookingUpdateInput = {};
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

  return db.booking.update({ where: { id }, data, include: bookingInclude });
}

async function listClients(filters: ClientListQuery) {
  const where: Prisma.ClientWhereInput = {};
  if (filters.status) where.status = filters.status;

  const page = filters.page;
  const limit = filters.limit;
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    db.client.count({ where }),
    db.client.findMany({
      where,
      orderBy: [{ [filters.sortBy]: filters.sortOrder }, { id: 'asc' }],
      include: {
        _count: {
          select: { bookings: true }
        }
      },
      skip,
      take: limit
    })
  ]);

  return buildPaginatedResult(items, total, page, limit);
}

async function createClient(input: CreateClientInput) {
  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;

  return db.client.create({
    data: {
      title: input.title ?? null,
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      phone: input.phone,
      age: input.age ?? null,
      sex: input.sex ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      zipcode: input.zipcode ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelationship: input.emergencyContactRelationship ?? null,
      proofOfAddressUrl: input.proofOfAddressUrl ?? null,
      notes: input.notes ?? null,
      status: input.status,
      source: ClientSource.ADMIN_CREATED
    }
  });
}

async function getClientById(id: string) {
  const client = await db.client.findUnique({
    where: { id },
    include: {
      bookings: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          assignedStaffId: true
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  return client;
}

async function updateClient(id: string, input: UpdateClientInput) {
  const existingClient = await db.client.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existingClient) {
    throw new ApiError(404, 'Client not found');
  }

  const data: any = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.email !== undefined) data.email = input.email ? normalizeEmail(input.email) : null;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.age !== undefined) data.age = input.age;
  if (input.sex !== undefined) data.sex = input.sex;
  if (input.address !== undefined) data.address = input.address;
  if (input.city !== undefined) data.city = input.city;
  if (input.zipcode !== undefined) data.zipcode = input.zipcode;
  if (input.emergencyContactName !== undefined) data.emergencyContactName = input.emergencyContactName;
  if (input.emergencyContactPhone !== undefined) data.emergencyContactPhone = input.emergencyContactPhone;
  if (input.emergencyContactRelationship !== undefined) {
    data.emergencyContactRelationship = input.emergencyContactRelationship;
  }
  if (input.proofOfAddressUrl !== undefined) data.proofOfAddressUrl = input.proofOfAddressUrl;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status !== undefined) data.status = input.status;

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, 'At least one valid field must be provided for update');
  }

  return db.client.update({
    where: { id },
    data
  });
}

async function deleteClient(id: string) {
  const client = await db.client.findUnique({
    where: { id },
    select: {
      id: true,
      _count: { select: { bookings: true } }
    }
  });

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  if (client._count.bookings > 0) {
    throw new ApiError(409, 'Client has related bookings and cannot be deleted');
  }

  await db.client.delete({ where: { id } });
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
    documents: profile.cvFileUrl
      ? [
          {
            type: 'doc',
            title: 'CV',
            date: profile.updatedAt
              ? new Intl.DateTimeFormat('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(profile.updatedAt))
              : '',
            size: '',
            url: profile.cvFileUrl
          }
        ]
      : []
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

async function provisionStaffCredentials(id: string, actorUserId: string) {
  const staff = await db.user.findFirst({
    where: staffLookupWhere(id),
    select: {
      id: true,
      staffCode: true,
      email: true,
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

  const hasWorkEmail = staff.email.endsWith('@dailyassistuk.com');
  const nextEmail = hasWorkEmail
    ? staff.email
    : await generateUniqueWorkEmail(staff.staffProfile.firstName, staff.staffProfile.lastName, staff.id);

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashValue(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.$transaction(async (tx: any) => {
    await tx.user.update({
      where: { id: staff.id },
      data: {
        email: nextEmail,
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

    await tx.passwordResetToken.create({
      data: {
        userId: staff.id,
        tokenHash,
        expiresAt
      }
    });
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(nextEmail, resetUrl);

  await recordAuditLog({
    actorUserId,
    action: 'UPDATE',
    entity: 'staff_credentials',
    entityId: staff.id,
    metadataJson: {
      email: nextEmail,
      emailRegenerated: !hasWorkEmail,
      onboardingEmailSent: true,
      deliveryMode: 'reset_link_only'
    }
  });

  return {
    id: staff.staffCode ?? staff.id,
    userId: staff.id,
    email: nextEmail,
    credentialsProvisioned: true,
    onboardingEmailSent: true,
    passwordDelivery: 'reset_link_only' as const,
    emailRegenerated: !hasWorkEmail
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
      staffCode: true,
      status: true
    }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  if (staff.status === UserStatus.INACTIVE) {
    return {
      id: staff.staffCode ?? staff.id,
      userId: staff.id,
      status: userStatusToFrontendStatus(staff.status)
    };
  }

  await db.$transaction([
    db.user.update({
      where: { id: staff.id },
      data: { status: UserStatus.INACTIVE }
    }),
    db.refreshToken.updateMany({
      where: { userId: staff.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);

  return {
    id: staff.staffCode ?? staff.id,
    userId: staff.id,
    status: 'unavailable' as const
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
