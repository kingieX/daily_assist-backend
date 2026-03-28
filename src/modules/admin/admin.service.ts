import {
  ApplicationStatus,
  BookingStatus,
  ClientSource,
  ClientStatus,
  Prisma,
  Role,
  UserStatus
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { hashPassword } from '../../utils/password';
import type {
  AssignBookingInput,
  BookingListQuery,
  CancelBookingInput,
  ClientListQuery,
  CompleteBookingInput,
  ConvertApplicationInput,
  CreateClientInput,
  CreateStaffInput,
  RecruitmentListQuery,
  ResetStaffPasswordInput,
  StaffListQuery,
  UpdateBookingInput,
  UpdateClientInput,
  UpdateRecruitmentStatusInput,
  UpdateStaffInput
} from './admin.validation';

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
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
      prisma.booking.count({ where: { status: BookingStatus.REQUESTED } }),
      prisma.booking.count({ where: { status: BookingStatus.ASSIGNED } }),
      prisma.client.count({ where: { status: ClientStatus.ACTIVE } }),
      prisma.user.count({ where: { role: Role.STAFF, status: UserStatus.ACTIVE } }),
      prisma.workerApplication.count({ where: { status: ApplicationStatus.PENDING } })
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
    prisma.booking.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.workerApplication.groupBy({ by: ['status'], _count: { status: true } })
  ]);

  return {
    bookingsByStatus: bookingsByStatus.map((entry) => ({
      status: entry.status,
      count: entry._count.status
    })),
    recruitmentByStatus: applicationsByStatus.map((entry) => ({
      status: entry.status,
      count: entry._count.status
    }))
  };
}

async function getDashboardAlerts() {
  const [unassigned, overdueRequested] = await Promise.all([
    prisma.booking.findMany({
      where: { status: BookingStatus.REQUESTED },
      orderBy: [{ createdAt: 'asc' }],
      take: 5,
      select: { id: true, createdAt: true, preferredDate: true }
    }),
    prisma.booking.findMany({
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
    prisma.booking.count({ where }),
    prisma.booking.findMany({
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
  const booking = await prisma.booking.findUnique({
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
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, status: true }
  });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
    throw new ApiError(400, 'Booking cannot be assigned in its current status');
  }

  const staffUser = await prisma.user.findFirst({
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

  return prisma.booking.update({
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
  const booking = await prisma.booking.findUnique({
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

  return prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledReason: input.reason
    },
    include: bookingInclude
  });
}

async function completeBooking(id: string, _input: CompleteBookingInput) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, status: true }
  });

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new ApiError(400, 'Cancelled booking cannot be completed');
  }

  return prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.COMPLETED
    },
    include: bookingInclude
  });
}

async function updateBooking(id: string, input: UpdateBookingInput) {
  const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true } });
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

  return prisma.booking.update({ where: { id }, data, include: bookingInclude });
}

async function listClients(filters: ClientListQuery) {
  const where: Prisma.ClientWhereInput = {};
  if (filters.status) where.status = filters.status;

  const page = filters.page;
  const limit = filters.limit;
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
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

  return prisma.client.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      phone: input.phone,
      address: input.address ?? null,
      city: input.city ?? null,
      zipcode: input.zipcode ?? null,
      status: input.status,
      source: ClientSource.ADMIN_CREATED
    }
  });
}

async function getClientById(id: string) {
  const client = await prisma.client.findUnique({
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
  const existingClient = await prisma.client.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existingClient) {
    throw new ApiError(404, 'Client not found');
  }

  const data: Prisma.ClientUpdateInput = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.email !== undefined) data.email = input.email ? normalizeEmail(input.email) : null;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.address !== undefined) data.address = input.address;
  if (input.city !== undefined) data.city = input.city;
  if (input.zipcode !== undefined) data.zipcode = input.zipcode;
  if (input.status !== undefined) data.status = input.status;

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, 'At least one valid field must be provided for update');
  }

  return prisma.client.update({
    where: { id },
    data
  });
}

async function deleteClient(id: string) {
  const client = await prisma.client.findUnique({
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

  await prisma.client.delete({ where: { id } });
}

async function listStaff(filters: StaffListQuery) {
  const page = filters.page;
  const limit = filters.limit;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    role: Role.STAFF,
    status: filters.status
  };

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ [filters.sortBy]: filters.sortOrder }, { id: 'asc' }],
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        staffProfile: true
      },
      skip,
      take: limit
    })
  ]);

  return buildPaginatedResult(items, total, page, limit);
}

async function createStaff(input: CreateStaffInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true }
  });

  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      role: Role.STAFF,
      status: input.status ?? UserStatus.ACTIVE,
      staffProfile: {
        create: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          address: input.address ?? null,
          city: input.city ?? null,
          zipcode: input.zipcode ?? null,
          emergencyContactName: input.emergencyContactName ?? null,
          emergencyContactPhone: input.emergencyContactPhone ?? null,
          emergencyContactRelationship: input.emergencyContactRelationship ?? null,
          photoUrl: input.photoUrl ?? null,
          summary: input.summary ?? null,
          skills: input.skills ?? null
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
}

async function getStaffById(id: string) {
  const staff = await prisma.user.findFirst({
    where: {
      id,
      role: Role.STAFF
    },
    select: {
      id: true,
      email: true,
      role: true,
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

  return staff;
}

async function resetStaffPassword(id: string, input: ResetStaffPasswordInput) {
  const staff = await prisma.user.findFirst({
    where: {
      id,
      role: Role.STAFF
    },
    select: { id: true }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: staff.id }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: staff.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);

  return { id: staff.id, passwordReset: true };
}

async function updateStaff(id: string, input: UpdateStaffInput) {
  const staff = await prisma.user.findFirst({
    where: {
      id,
      role: Role.STAFF
    },
    include: { staffProfile: true }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  const normalizedEmail = input.email ? normalizeEmail(input.email) : undefined;
  if (normalizedEmail && normalizedEmail !== staff.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    });
    if (emailExists) {
      throw new ApiError(409, 'A user with this email already exists');
    }
  }

  const userData: Prisma.UserUpdateInput = {};
  if (normalizedEmail !== undefined) userData.email = normalizedEmail;
  if (input.status !== undefined) userData.status = input.status;

  const hasProfileUpdates =
    input.firstName !== undefined ||
    input.lastName !== undefined ||
    input.phone !== undefined ||
    input.address !== undefined ||
    input.city !== undefined ||
    input.zipcode !== undefined ||
    input.emergencyContactName !== undefined ||
    input.emergencyContactPhone !== undefined ||
    input.emergencyContactRelationship !== undefined ||
    input.photoUrl !== undefined ||
    input.summary !== undefined ||
    input.skills !== undefined;

  if (hasProfileUpdates) {
    if (staff.staffProfile) {
      const profileData: Prisma.StaffProfileUpdateInput = {};
      if (input.firstName !== undefined) profileData.firstName = input.firstName;
      if (input.lastName !== undefined) profileData.lastName = input.lastName;
      if (input.phone !== undefined) profileData.phone = input.phone;
      if (input.address !== undefined) profileData.address = input.address;
      if (input.city !== undefined) profileData.city = input.city;
      if (input.zipcode !== undefined) profileData.zipcode = input.zipcode;
      if (input.emergencyContactName !== undefined) {
        profileData.emergencyContactName = input.emergencyContactName;
      }
      if (input.emergencyContactPhone !== undefined) {
        profileData.emergencyContactPhone = input.emergencyContactPhone;
      }
      if (input.emergencyContactRelationship !== undefined) {
        profileData.emergencyContactRelationship = input.emergencyContactRelationship;
      }
      if (input.photoUrl !== undefined) profileData.photoUrl = input.photoUrl;
      if (input.summary !== undefined) profileData.summary = input.summary;
      if (input.skills !== undefined) profileData.skills = input.skills;

      userData.staffProfile = {
        update: profileData
      };
    } else {
      if (!input.firstName || !input.lastName || !input.phone) {
        throw new ApiError(
          400,
          'firstName, lastName, and phone are required to create a missing staff profile'
        );
      }

      userData.staffProfile = {
        create: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          address: input.address ?? null,
          city: input.city ?? null,
          zipcode: input.zipcode ?? null,
          emergencyContactName: input.emergencyContactName ?? null,
          emergencyContactPhone: input.emergencyContactPhone ?? null,
          emergencyContactRelationship: input.emergencyContactRelationship ?? null,
          photoUrl: input.photoUrl ?? null,
          summary: input.summary ?? null,
          skills: input.skills ?? null
        }
      };
    }
  }

  if (Object.keys(userData).length === 0) {
    throw new ApiError(400, 'At least one valid field must be provided for update');
  }

  return prisma.user.update({
    where: { id },
    data: userData,
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      staffProfile: true
    }
  });
}

async function deleteStaff(id: string) {
  const staff = await prisma.user.findFirst({
    where: {
      id,
      role: Role.STAFF
    },
    select: {
      id: true,
      status: true
    }
  });

  if (!staff) {
    throw new ApiError(404, 'Staff user not found');
  }

  if (staff.status === UserStatus.INACTIVE) {
    return {
      id: staff.id,
      status: staff.status
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: staff.id },
      data: { status: UserStatus.INACTIVE }
    }),
    prisma.refreshToken.updateMany({
      where: { userId: staff.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);

  return {
    id: staff.id,
    status: UserStatus.INACTIVE
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
    prisma.workerApplication.count({ where }),
    prisma.workerApplication.findMany({
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
  const application = await prisma.workerApplication.findUnique({
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
  const existingApplication = await prisma.workerApplication.findUnique({
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

  return prisma.workerApplication.update({
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
  const application = await prisma.workerApplication.findUnique({
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
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true }
  });

  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const staffUser = await tx.user.create({
      data: {
        email: normalizedEmail,
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
  resetStaffPassword,
  updateStaff,
  deleteStaff,
  listRecruitmentApplications,
  getRecruitmentApplicationById,
  updateRecruitmentStatus,
  convertApplicationToStaff
};
