import { Prisma, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { assertTransition, VISIT_STATUS } from './visit-state';
import type {
  AdminVisitListQuery,
  CancelVisitInput,
  CheckOutVisitInput,
  CreateVisitInput,
  ReassignVisitInput,
  UpdateVisitInput
} from './visit.validation';

const VISIT_EVENT = {
  ASSIGNED: 'ASSIGNED',
  REASSIGNED: 'REASSIGNED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NOTE_UPDATED: 'NOTE_UPDATED'
} as const;

type VisitEventValue = (typeof VISIT_EVENT)[keyof typeof VISIT_EVENT];

function paginatedResult<T>(items: T[], total: number, page: number, limit: number) {
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

const visitInclude = {
  booking: {
    select: {
      id: true,
      status: true,
      preferredDate: true,
      preferredTime: true,
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true
        }
      }
    }
  },
  staff: {
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
} satisfies Prisma.VisitInclude;

async function addVisitEvent(
  tx: Prisma.TransactionClient,
  visitId: string,
  actorUserId: string,
  eventType: VisitEventValue,
  payloadJson?: Prisma.InputJsonValue
) {
  await tx.visitEvent.create({
    data: {
      visitId,
      actorUserId,
      eventType,
      payloadJson: payloadJson ?? Prisma.DbNull
    }
  });
}

async function listAdminVisits(query: AdminVisitListQuery) {
  const where: Prisma.VisitWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.staffId) where.staffId = query.staffId;
  if (query.bookingId) where.bookingId = query.bookingId;

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
      skip,
      take: limit
    })
  ]);

  return paginatedResult(items, total, page, limit);
}

async function getVisitById(id: string) {
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      ...visitInclude,
      events: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          actorUserId: true,
          eventType: true,
          payloadJson: true,
          createdAt: true
        }
      }
    }
  });

  if (!visit) {
    throw new ApiError(404, 'Visit not found');
  }

  return visit;
}

async function createVisit(input: CreateVisitInput, actorUserId: string) {
  const [booking, staff] = await Promise.all([
    prisma.booking.findUnique({ where: { id: input.bookingId }, select: { id: true } }),
    prisma.user.findFirst({
      where: { id: input.staffId, role: Role.STAFF, status: UserStatus.ACTIVE },
      select: { id: true }
    })
  ]);

  if (!booking) throw new ApiError(404, 'Booking not found');
  if (!staff) throw new ApiError(404, 'Active staff user not found');

  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.create({
      data: {
        bookingId: input.bookingId,
        staffId: input.staffId,
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        adminNotes: input.adminNotes ?? null,
        status: VISIT_STATUS.ASSIGNED
      },
      include: visitInclude
    });

    await addVisitEvent(tx, visit.id, actorUserId, VISIT_EVENT.ASSIGNED, {
      staffId: input.staffId,
      scheduledStartAt: input.scheduledStartAt.toISOString(),
      scheduledEndAt: input.scheduledEndAt.toISOString()
    });

    return visit;
  });
}

async function updateVisit(id: string, input: UpdateVisitInput, actorUserId: string) {
  const existing = await prisma.visit.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Visit not found');

  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.update({
      where: { id },
      data: {
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        adminNotes: input.adminNotes,
        staffNotes: input.staffNotes
      },
      include: visitInclude
    });

    await addVisitEvent(tx, id, actorUserId, VISIT_EVENT.NOTE_UPDATED, {
      updatedFields: Object.keys(input)
    });

    return visit;
  });
}

async function reassignVisit(id: string, input: ReassignVisitInput, actorUserId: string) {
  const [visit, staff] = await Promise.all([
    prisma.visit.findUnique({ where: { id } }),
    prisma.user.findFirst({
      where: { id: input.staffId, role: Role.STAFF, status: UserStatus.ACTIVE },
      select: { id: true }
    })
  ]);

  if (!visit) throw new ApiError(404, 'Visit not found');
  if (!staff) throw new ApiError(404, 'Active staff user not found');
  if (visit.status === VISIT_STATUS.COMPLETED || visit.status === VISIT_STATUS.CANCELLED) {
    throw new ApiError(400, 'Visit cannot be reassigned in current status');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: { id },
      data: { staffId: input.staffId, status: VISIT_STATUS.ASSIGNED, acknowledgedAt: null },
      include: visitInclude
    });

    await addVisitEvent(tx, id, actorUserId, VISIT_EVENT.REASSIGNED, {
      fromStaffId: visit.staffId,
      toStaffId: input.staffId
    });

    return updated;
  });
}

async function cancelVisit(id: string, input: CancelVisitInput, actorUserId: string) {
  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit) throw new ApiError(404, 'Visit not found');

  assertTransition(visit.status, VISIT_STATUS.CANCELLED);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: { id },
      data: { status: VISIT_STATUS.CANCELLED },
      include: visitInclude
    });

    await addVisitEvent(tx, id, actorUserId, VISIT_EVENT.CANCELLED, {
      reason: input.reason
    });

    return updated;
  });
}

async function getStaffVisitOrThrow(visitId: string, staffUserId: string) {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, staffId: staffUserId },
    include: visitInclude
  });

  if (!visit) {
    throw new ApiError(404, 'Visit not found for current staff user');
  }

  return visit;
}

async function listStaffTodayVisits(staffUserId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return prisma.visit.findMany({
    where: {
      staffId: staffUserId,
      scheduledStartAt: { gte: start, lt: end }
    },
    include: visitInclude,
    orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }]
  });
}

async function listStaffVisitHistory(staffUserId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const where: Prisma.VisitWhereInput = {
    staffId: staffUserId,
    status: { in: [VISIT_STATUS.COMPLETED, VISIT_STATUS.CANCELLED, VISIT_STATUS.NO_SHOW] }
  };

  const [total, items] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: [{ scheduledStartAt: 'desc' }, { id: 'asc' }],
      skip,
      take: limit
    })
  ]);

  return paginatedResult(items, total, page, limit);
}

async function acknowledgeVisit(visitId: string, staffUserId: string) {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, staffId: staffUserId } });
  if (!visit) throw new ApiError(404, 'Visit not found for current staff user');

  assertTransition(visit.status, VISIT_STATUS.ACKNOWLEDGED);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: { id: visitId },
      data: { status: VISIT_STATUS.ACKNOWLEDGED, acknowledgedAt: new Date() },
      include: visitInclude
    });

    await addVisitEvent(tx, visitId, staffUserId, VISIT_EVENT.ACKNOWLEDGED);
    return updated;
  });
}

async function checkInVisit(visitId: string, staffUserId: string) {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, staffId: staffUserId } });
  if (!visit) throw new ApiError(404, 'Visit not found for current staff user');

  assertTransition(visit.status, VISIT_STATUS.IN_PROGRESS);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: { id: visitId },
      data: { status: VISIT_STATUS.IN_PROGRESS, checkInAt: new Date() },
      include: visitInclude
    });

    await addVisitEvent(tx, visitId, staffUserId, VISIT_EVENT.CHECKED_IN);
    return updated;
  });
}

async function checkOutVisit(visitId: string, staffUserId: string, input: CheckOutVisitInput) {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, staffId: staffUserId } });
  if (!visit) throw new ApiError(404, 'Visit not found for current staff user');

  assertTransition(visit.status, VISIT_STATUS.COMPLETED);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: { id: visitId },
      data: {
        status: VISIT_STATUS.COMPLETED,
        checkOutAt: new Date(),
        completionSummary: input.completionSummary,
        staffNotes: input.staffNotes
      },
      include: visitInclude
    });

    await addVisitEvent(tx, visitId, staffUserId, VISIT_EVENT.CHECKED_OUT, {
      completionSummaryProvided: Boolean(input.completionSummary)
    });

    return updated;
  });
}

export const visitService = {
  listAdminVisits,
  getVisitById,
  createVisit,
  updateVisit,
  reassignVisit,
  cancelVisit,
  listStaffTodayVisits,
  listStaffVisitHistory,
  getStaffVisitOrThrow,
  acknowledgeVisit,
  checkInVisit,
  checkOutVisit
};
