import { BookingStatus, ClientSource, NotificationType, Prisma, Role, ServiceType, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { enqueueNotificationEvent } from '../notifications/notification-events.service';
import { ApiError } from '../../utils/api-error';
import { recordAuditLog } from '../operations/audit-log.service';
import { assertTransition, VISIT_STATUS } from './visit-state';
import type {
  AdminVisitListQuery,
  CancelVisitInput,
  CheckOutVisitInput,
  CreateVisitInput,
  StaffVisitListQuery,
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
          phone: true,
          title: true,
          address: true
        }
      },
      bookingServices: true,
      package: { select: { name: true } }
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


function parseVisitDateTime(date?: string, time?: string) {
  if (!date || !time) return undefined;
  const match = time.match(/^(\d{1,2}):00\s+(Am|Pm)$/i);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const meridiem = match[2].toLowerCase();
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00.000Z`);
}

function staffName(staff: any) {
  return [staff?.staffProfile?.firstName, staff?.staffProfile?.lastName].filter(Boolean).join(' ') || staff?.email || '';
}

function apiVisitStatus(status: string) {
  if (status === VISIT_STATUS.COMPLETED) return 'completed';
  if (status === VISIT_STATUS.IN_PROGRESS) return 'in-progress';
  if (status === VISIT_STATUS.NO_SHOW) return 'late';
  if (status === VISIT_STATUS.ASSIGNED) return 'Assigned';
  return 'not-started';
}

function staffVisitStatus(status: string) {
  if (status === VISIT_STATUS.COMPLETED) return 'completed';
  if (status === VISIT_STATUS.IN_PROGRESS) return 'in-progress';
  return 'not-started';
}

function formatDisplayTime(value: Date) {
  return value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).toLowerCase().replace(' ', '');
}

function visitTimeLabel(visit: any) {
  return `${visit.scheduledStartAt.toISOString().slice(11, 16)} - ${visit.scheduledEndAt.toISOString().slice(11, 16)}`;
}

function planSnapshot(visit: any) {
  return (visit.booking?.selectedPlanSnapshot && typeof visit.booking.selectedPlanSnapshot === 'object') ? visit.booking.selectedPlanSnapshot as any : {};
}

function serializeVisit(visit: any) {
  const snapshot = planSnapshot(visit);
  const selected = (visit.booking?.bookingServices ?? []).filter((s: any) => s.serviceType === 'SELECTED').map((s: any) => s.serviceNameSnapshot);
  const additional = (visit.booking?.bookingServices ?? []).filter((s: any) => s.serviceType === 'ADDITIONAL').map((s: any) => s.serviceNameSnapshot);
  return {
    id: visit.id,
    clientTitle: snapshot.clientTitle ?? visit.booking?.client?.title ?? '',
    clientName: snapshot.clientName || [visit.booking?.client?.firstName, visit.booking?.client?.lastName].filter(Boolean).join(' ') || '',
    clientId: visit.booking?.client?.id ?? null,
    address: snapshot.address ?? visit.booking?.client?.address ?? '',
    date: visit.scheduledStartAt.toISOString().slice(0, 10),
    startTime: snapshot.startTime ?? visit.scheduledStartAt.toISOString().slice(11, 16),
    endTime: snapshot.endTime ?? visit.scheduledEndAt.toISOString().slice(11, 16),
    staffId: visit.staffId,
    staffName: staffName(visit.staff),
    package: visit.booking?.package?.name ?? snapshot.package ?? '',
    selectedServiceTypes: selected.length ? selected : (snapshot.selectedServiceTypes ?? []),
    selectedAdditional: additional.length ? additional : (snapshot.selectedAdditional ?? []),
    note: visit.adminNotes ?? snapshot.note ?? '',
    status: apiVisitStatus(visit.status),
    time: visitTimeLabel(visit)
  };
}

function serializeStaffVisitListItem(visit: any) {
  const full = serializeVisit(visit);
  return {
    id: visit.id,
    clientName: full.clientName,
    address: full.address,
    task: full.selectedServiceTypes[0] ?? full.package,
    date: full.date,
    timeStart: formatDisplayTime(visit.scheduledStartAt),
    timeEnd: formatDisplayTime(visit.scheduledEndAt),
    status: staffVisitStatus(visit.status)
  };
}

function serializeStaffVisitDetail(visit: any) {
  const item = serializeStaffVisitListItem(visit);
  return {
    ...item,
    additionalNote: visit.adminNotes ?? planSnapshot(visit).note ?? '',
    checkInAt: visit.checkInAt ? visit.checkInAt.toISOString() : null,
    checkOutAt: visit.checkOutAt ? visit.checkOutAt.toISOString() : null
  };
}

function serializeVisitLog(log: any) {
  return {
    id: log.id,
    visitTypes: Array.isArray(log.visitTypes) ? log.visitTypes : [],
    otherService: log.otherService,
    miles: log.miles,
    notes: log.notes,
    signature: log.signature,
    confirmed: log.confirmed,
    submittedAt: log.submittedAt.toISOString()
  };
}

function serializeTask(visit: any) {
  const full = serializeVisit(visit);
  return { id: full.id, client: full.clientName, status: full.status, address: full.address, serviceType: full.selectedServiceTypes[0] ?? full.package, time: full.time, notes: full.note };
}

async function notifyVisit(userId: string, title: string, body: string, visitId: string, eventType: 'visit.assigned' | 'visit.reassigned' | 'visit.cancelled') {
  await enqueueNotificationEvent(eventType, { recipientIds: [userId], type: NotificationType.VISIT, title, body, metadataJson: { visitId } });
}

async function ensureFrontendBooking(tx: Prisma.TransactionClient, input: any) {
  if (input.bookingId) return input.bookingId;
  const [firstName, ...rest] = input.clientName.trim().split(/\s+/);
  const packageRecord = await tx.package.findFirst({ where: { name: input.package }, select: { id: true } });
  const client = await tx.client.create({ data: { firstName, lastName: rest.join(' ') || '', title: input.clientTitle, phone: 'Not provided', address: input.address, source: ClientSource.ADMIN_CREATED } });
  const booking = await tx.booking.create({
    data: {
      clientId: client.id,
      packageId: packageRecord?.id,
      preferredDate: parseVisitDateTime(input.date, input.startTime),
      preferredTime: input.startTime,
      startDate: parseVisitDateTime(input.date, input.startTime),
      selectedPlanSnapshot: { clientTitle: input.clientTitle, clientName: input.clientName, address: input.address, package: input.package, startTime: input.startTime, endTime: input.endTime, selectedServiceTypes: input.selectedServiceTypes ?? [], selectedAdditional: input.selectedAdditional ?? [], note: input.note },
      agreeToTerms: true,
      consentToDailyassist: true,
      status: BookingStatus.ASSIGNED,
      assignedStaffId: input.staffId,
      bookingServices: {
        create: [
          ...(input.selectedServiceTypes ?? []).map((serviceNameSnapshot: string) => ({ serviceNameSnapshot, serviceType: ServiceType.SELECTED })),
          ...(input.selectedAdditional ?? []).map((serviceNameSnapshot: string) => ({ serviceNameSnapshot, serviceType: ServiceType.ADDITIONAL }))
        ]
      }
    }
  });
  return booking.id;
}

async function listAdminVisits(_query: AdminVisitListQuery) {
  const { start, end } = dayBounds();

  const staff = await prisma.user.findMany({
    where: { role: Role.STAFF, status: UserStatus.ACTIVE },
    include: { staffProfile: true, visitsAsStaff: { where: { status: { not: VISIT_STATUS.CANCELLED }, scheduledStartAt: { gte: start, lt: end } } } },
    orderBy: { createdAt: 'asc' }
  });

  return staff.map((member: any) => ({
    id: member.id,
    name: staffName(member),
    status: String(member.status).toLowerCase(),
    phone: member.staffProfile?.phone ?? '',
    email: member.email,
    photo: member.staffProfile?.photoUrl ?? null,
    tasksDone: member.visitsAsStaff.filter((visit: any) => visit.status === VISIT_STATUS.COMPLETED).length,
    tasksTotal: member.visitsAsStaff.length
  }));
}

async function getVisitById(id: string) {
  return getStaffWithTasks(id);
}

async function getStaffWithTasks(staffId: string) {
  const member = await prisma.user.findFirst({
    where: { id: staffId, role: Role.STAFF },
    include: { staffProfile: true, visitsAsStaff: { where: { status: { not: VISIT_STATUS.CANCELLED } }, include: visitInclude, orderBy: [{ scheduledStartAt: 'asc' }] } }
  });
  if (!member) throw new ApiError(404, 'Staff not found');
  const tasks = member.visitsAsStaff.map(serializeTask);
  return { id: member.id, name: staffName(member), role: member.staffProfile?.staffRoleLabel ?? 'Support Worker', phone: member.staffProfile?.phone ?? '', email: member.email, status: String(member.status).toLowerCase(), photo: member.staffProfile?.photoUrl ?? null, ownsCar: Boolean(member.staffProfile?.ownsCar), trainingUpToDate: false, milesCovered: '0 miles', tasksDone: tasks.filter((t: any) => t.status === 'completed').length, tasksTotal: tasks.length, tasks };
}

async function getStaffTask(staffId: string, taskId: string) {
  const visit = await prisma.visit.findFirst({ where: { id: taskId, staffId, status: { not: VISIT_STATUS.CANCELLED } }, include: visitInclude });
  if (!visit) throw new ApiError(404, 'Visit not found for staff member');
  return serializeVisit(visit);
}

async function createVisit(input: CreateVisitInput, actorUserId: string) {
  const staff = await prisma.user.findFirst({ where: { id: input.staffId, role: Role.STAFF, status: UserStatus.ACTIVE }, select: { id: true } });
  if (!staff) throw new ApiError(404, 'Active staff user not found');
  const start = input.scheduledStartAt ?? parseVisitDateTime((input as any).date, (input as any).startTime);
  const end = input.scheduledEndAt ?? parseVisitDateTime((input as any).date, (input as any).endTime);
  if (!start || !end || end <= start) throw new ApiError(400, 'endTime must be after startTime');
  const created = await prisma.$transaction(async (tx) => {
    const bookingId = await ensureFrontendBooking(tx, input);
    const visit = await tx.visit.create({ data: { bookingId, staffId: input.staffId, scheduledStartAt: start, scheduledEndAt: end, adminNotes: (input as any).note ?? input.adminNotes ?? null, status: VISIT_STATUS.ASSIGNED }, include: visitInclude });
    await addVisitEvent(tx, visit.id, actorUserId, VISIT_EVENT.ASSIGNED, { staffId: input.staffId });
    return serializeVisit(visit);
  });
  await notifyVisit(input.staffId, 'New visit assigned', 'A new visit has been assigned to you.', created.id, 'visit.assigned');
  await recordAuditLog({ actorUserId, action: 'CREATE', module: 'VISITS', entity: 'visit', entityId: created.id, affectedItem: created.id, description: 'Created visit', metadataJson: { staffId: input.staffId, bookingId: (created as any).bookingId ?? null } });
  return created;
}

async function updateVisit(id: string, input: UpdateVisitInput, actorUserId: string) {
  const existing = await prisma.visit.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Visit not found');
  const newStaffId = (input as any).staffId;
  if (newStaffId) {
    const staff = await prisma.user.findFirst({ where: { id: newStaffId, role: Role.STAFF, status: UserStatus.ACTIVE }, select: { id: true } });
    if (!staff) throw new ApiError(404, 'Active staff user not found');
  }
  const start = input.scheduledStartAt ?? parseVisitDateTime((input as any).date, (input as any).startTime);
  const end = input.scheduledEndAt ?? parseVisitDateTime((input as any).date, (input as any).endTime);
  if (start && end && end <= start) throw new ApiError(400, 'endTime must be after startTime');
  const updated = await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.update({ where: { id }, data: { scheduledStartAt: start, scheduledEndAt: end, adminNotes: (input as any).note ?? input.adminNotes, staffNotes: input.staffNotes, staffId: newStaffId }, include: visitInclude });
    await addVisitEvent(tx, id, actorUserId, newStaffId && newStaffId !== existing.staffId ? VISIT_EVENT.REASSIGNED : VISIT_EVENT.NOTE_UPDATED, { updatedFields: Object.keys(input) });
    return serializeVisit(visit);
  });
  if (newStaffId && newStaffId !== existing.staffId) {
    await notifyVisit(existing.staffId, 'Visit reassigned', 'A visit has been removed from your schedule.', id, 'visit.reassigned');
    await notifyVisit(newStaffId, 'Visit assigned', 'A visit has been assigned to you.', id, 'visit.assigned');
  }
  await recordAuditLog({ actorUserId, action: newStaffId && newStaffId !== existing.staffId ? 'ASSIGN' : 'UPDATE', module: 'VISITS', entity: 'visit', entityId: id, affectedItem: id, description: newStaffId && newStaffId !== existing.staffId ? 'Reassigned visit' : 'Updated visit', metadataJson: { previousStaffId: existing.staffId, newStaffId: newStaffId ?? existing.staffId, changedFields: Object.keys(input) } });
  return updated;
}

async function reassignVisit(id: string, input: ReassignVisitInput, actorUserId: string) {
  return updateVisit(id, input as any, actorUserId);
}

async function cancelVisit(id: string, input: CancelVisitInput, actorUserId: string) {
  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit) throw new ApiError(404, 'Visit not found');
  const updated = await prisma.$transaction(async (tx) => {
    const updatedVisit = await tx.visit.update({ where: { id }, data: { status: VISIT_STATUS.CANCELLED }, include: visitInclude });
    await addVisitEvent(tx, id, actorUserId, VISIT_EVENT.CANCELLED, { reason: input.reason ?? 'Cancelled by admin' });
    return serializeVisit(updatedVisit);
  });
  await notifyVisit(visit.staffId, 'Visit cancelled', 'A visit has been cancelled and removed from your task list.', id, 'visit.cancelled');
  await recordAuditLog({ actorUserId, action: 'CANCEL', module: 'VISITS', entity: 'visit', entityId: id, affectedItem: id, description: 'Cancelled visit', metadataJson: { reason: input.reason ?? 'Cancelled by admin', previousStatus: visit.status, newStatus: VISIT_STATUS.CANCELLED } });
  return updated;
}

async function getStaffVisitOrThrowRaw(visitId: string, staffUserId: string) {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, staffId: staffUserId },
    include: visitInclude
  });

  if (!visit) {
    throw new ApiError(404, 'Visit not found for current staff user');
  }

  return visit;
}

async function getStaffVisitOrThrow(visitId: string, staffUserId: string) {
  return serializeStaffVisitDetail(await getStaffVisitOrThrowRaw(visitId, staffUserId));
}

function dayBounds(offsetDays = 0) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + offsetDays);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function dateRangeWhere(query?: Partial<StaffVisitListQuery>) {
  const range: Prisma.DateTimeFilter = {};
  if (query?.startDate) range.gte = new Date(`${query.startDate}T00:00:00.000Z`);
  if (query?.endDate) range.lt = new Date(`${query.endDate}T00:00:00.000Z`);
  if (range.gte || range.lt) return range;
  return undefined;
}

function dbStatuses(status?: string) {
  if (status === 'completed') return [VISIT_STATUS.COMPLETED];
  if (status === 'in-progress') return [VISIT_STATUS.IN_PROGRESS];
  if (status === 'not-started') return [VISIT_STATUS.ASSIGNED, VISIT_STATUS.ACKNOWLEDGED];
  return undefined;
}

async function listStaffTodayVisits(staffUserId: string) {
  const { start, end } = dayBounds();

  const visits = await prisma.visit.findMany({
    where: {
      staffId: staffUserId,
      status: { not: VISIT_STATUS.CANCELLED },
      scheduledStartAt: { gte: start, lt: end }
    },
    include: visitInclude,
    orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }]
  });
  return visits.map(serializeStaffVisitListItem);
}

async function listStaffFutureVisits(staffUserId: string) {
  const { end } = dayBounds();
  const visits = await prisma.visit.findMany({ where: { staffId: staffUserId, status: { not: VISIT_STATUS.CANCELLED }, scheduledStartAt: { gte: end } }, include: visitInclude, orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }] });
  return visits.map(serializeStaffVisitListItem);
}

async function listStaffVisits(staffUserId: string, query: StaffVisitListQuery) {
  const skip = (query.page - 1) * query.limit;
  const where: Prisma.VisitWhereInput = { staffId: staffUserId, status: { not: VISIT_STATUS.CANCELLED } };
  const range = dateRangeWhere(query);
  const statuses = dbStatuses(query.status);
  if (range) where.scheduledStartAt = range;
  if (statuses) where.status = { in: statuses };
  const [total, items] = await Promise.all([prisma.visit.count({ where }), prisma.visit.findMany({ where, include: visitInclude, orderBy: [{ scheduledStartAt: query.sortOrder ?? 'asc' }, { id: 'asc' }], skip, take: query.limit })]);
  return paginatedResult(items.map(serializeStaffVisitListItem), total, query.page, query.limit);
}

async function listStaffVisitHistory(staffUserId: string, page: number, limit: number, query?: StaffVisitListQuery) {
  const skip = (page - 1) * limit;
  const where: Prisma.VisitWhereInput = {
    staffId: staffUserId,
    OR: [{ status: VISIT_STATUS.COMPLETED }, { scheduledStartAt: { lt: dayBounds().start } }],
    status: { not: VISIT_STATUS.CANCELLED }
  };
  const range = dateRangeWhere(query);
  if (range) where.scheduledStartAt = range;

  const [total, items] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: [{ scheduledStartAt: query?.sortOrder ?? 'desc' }, { id: 'asc' }],
      skip,
      take: limit
    })
  ]);

  return paginatedResult(items.map(serializeStaffVisitListItem), total, page, limit);
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
    await recordAuditLog({ actorUserId: staffUserId, action: 'STATUS_CHANGE', module: 'VISITS', entity: 'visit', entityId: visitId, affectedItem: visitId, description: 'Acknowledged visit', metadataJson: { previousStatus: visit.status, newStatus: VISIT_STATUS.ACKNOWLEDGED } });
    return updated;
  });
}

async function checkInVisit(visitId: string, staffUserId: string) {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, staffId: staffUserId } });
  if (!visit) throw new ApiError(404, 'Visit not found for current staff user');

  if (visit.status === VISIT_STATUS.IN_PROGRESS || visit.status === VISIT_STATUS.COMPLETED) throw new ApiError(409, 'Visit is already in progress or completed');
  if (![VISIT_STATUS.ASSIGNED, VISIT_STATUS.ACKNOWLEDGED].includes(visit.status as any)) throw new ApiError(409, 'Visit cannot be checked in');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.visit.update({
      where: { id: visitId },
      data: { status: VISIT_STATUS.IN_PROGRESS, checkInAt: new Date() },
      include: visitInclude
    });

    await addVisitEvent(tx, visitId, staffUserId, VISIT_EVENT.CHECKED_IN);
    await recordAuditLog({ actorUserId: staffUserId, action: 'STATUS_CHANGE', module: 'VISITS', entity: 'visit', entityId: visitId, affectedItem: visitId, description: 'Checked in to visit', metadataJson: { previousStatus: visit.status, newStatus: VISIT_STATUS.IN_PROGRESS } });
    return { id: updated.id, status: staffVisitStatus(updated.status), checkInAt: updated.checkInAt?.toISOString() ?? null };
  });
}

async function checkOutVisit(visitId: string, staffUserId: string, input: CheckOutVisitInput) {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, staffId: staffUserId } });
  if (!visit) throw new ApiError(404, 'Visit not found for current staff user');

  if (visit.status === VISIT_STATUS.COMPLETED) throw new ApiError(409, 'Visit is already completed');
  if (visit.status !== VISIT_STATUS.IN_PROGRESS || !visit.checkInAt) throw new ApiError(409, 'Visit must be checked in before check-out');

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.visit.update({ where: { id: visitId }, data: { status: VISIT_STATUS.COMPLETED, checkOutAt: now, completionSummary: input.notes, staffNotes: input.notes }, include: visitInclude });
    const log = await (tx as any).visitLog.create({ data: { visitId, staffId: staffUserId, visitTypes: input.visitTypes, otherService: input.otherService, miles: input.miles, notes: input.notes, signature: input.signature, confirmed: input.confirmed, submittedAt: now } });

    await addVisitEvent(tx, visitId, staffUserId, VISIT_EVENT.CHECKED_OUT, {
      completionSummaryProvided: Boolean(input.notes),
      logId: log.id
    });

    await recordAuditLog({ actorUserId: staffUserId, action: 'STATUS_CHANGE', module: 'VISITS', entity: 'visit', entityId: visitId, affectedItem: visitId, description: 'Checked out and completed visit', metadataJson: { previousStatus: visit.status, newStatus: VISIT_STATUS.COMPLETED, visitLogId: log.id } });
    return { id: updated.id, status: staffVisitStatus(updated.status), checkOutAt: updated.checkOutAt?.toISOString() ?? now.toISOString(), log: serializeVisitLog(log) };
  });
}

export const visitService = {
  listAdminVisits,
  getVisitById,
  getStaffWithTasks,
  getStaffTask,
  createVisit,
  updateVisit,
  reassignVisit,
  cancelVisit,
  listStaffTodayVisits,
  listStaffVisitHistory,
  listStaffFutureVisits,
  listStaffVisits,
  getStaffVisitOrThrow,
  acknowledgeVisit,
  checkInVisit,
  checkOutVisit
};
