import fs from 'fs/promises';
import path from 'path';
import { Role, User, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { comparePassword, hashPassword } from '../../utils/password';
import { recordAuditLog } from '../operations/audit-log.service';

const adminNotificationItems = [
  {
    key: 'bookingRequest',
    label: 'Booking Request',
    sub: 'Notify me when a new booking request is submitted.'
  },
  {
    key: 'staffCheckin',
    label: 'Staff Check-in',
    sub: 'Notify me when staff check in for visits.'
  },
  {
    key: 'staffCheckout',
    label: 'Staff Checkout',
    sub: 'Notify me when staff check out from visits.'
  },
  {
    key: 'missedCheckin',
    label: 'Missed Check-in',
    sub: 'Notify me when staff miss scheduled check-ins.'
  },
  {
    key: 'missedCheckout',
    label: 'Missed Checkout',
    sub: 'Notify me when staff miss scheduled checkouts.'
  }
] as const;

const superAdminNotificationItems = [
  { key: 'accountSignin', label: 'Account Sign-in', sub: 'Notify me when an admin account signs in.' },
  { key: 'accountInfoChanges', label: 'Account Information Changes', sub: 'Notify me when account information changes.' },
  ...adminNotificationItems
] as const;

const defaultNotificationValues = Object.fromEntries(adminNotificationItems.map((item) => [item.key, true]));
const defaultSuperAdminNotificationValues = Object.fromEntries(superAdminNotificationItems.map((item) => [item.key, { email: true, dashboard: true }]));

const rolesPermissions = {
  admin: [
    { key: 'approveBookings', label: 'Approve Bookings', value: true },
    { key: 'assignVisits', label: 'Assign Visits', value: true },
    { key: 'manageClients', label: 'Manage Clients', value: true },
    { key: 'addOtherAdmin', label: 'Add Other Admin', value: false },
    { key: 'manageStaff', label: 'Manage Staff', value: true },
    { key: 'sendMessage', label: 'Send Message', value: true },
    { key: 'viewReports', label: 'View Reports', value: true }
  ],
  staff: [
    { key: 'approveBookings', label: 'Approve Bookings', value: false },
    { key: 'viewAssignVisits', label: 'View Assign Visits', value: true },
    { key: 'manageClients', label: 'Manage Clients', value: false },
    { key: 'manageStaff', label: 'Manage Staff', value: true },
    { key: 'sendMessage', label: 'Send Message', value: true },
    { key: 'viewReports', label: 'View Reports', value: false }
  ]
};

type AdminProfileUser = User & {
  staffProfile?: { firstName: string; lastName: string; photoUrl: string | null } | null;
};

type SystemLogQuery = {
  actorUserId?: string;
  user?: string;
  action?: string;
  module?: string;
  dateRange?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page: number;
  pageSize: number;
};

function titleRole(role: Role): string {
  if (role === Role.SUPER_ADMIN) return 'Super Admin';
  if (role === Role.ADMIN) return 'Admin';
  return 'Support Worker';
}

function adminProfile(user: AdminProfileUser) {
  return {
    id: user.id,
    firstName: user.firstName ?? user.staffProfile?.firstName ?? '',
    lastName: user.lastName ?? user.staffProfile?.lastName ?? '',
    email: user.email,
    role: titleRole(user.role),
    photoUrl: user.photoUrl ?? user.staffProfile?.photoUrl ?? null
  };
}

function notificationSettingKey(userId: string): string {
  return `adminNotificationSettings:${userId}`;
}

async function saveBase64Photo(userId: string, value: string): Promise<string> {
  const match = value.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return value;
  }

  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const directory = path.resolve(process.cwd(), 'uploads', 'admin', 'photos');
  await fs.mkdir(directory, { recursive: true });

  const filename = `admin-${userId}-${Date.now()}.${extension}`;
  await fs.writeFile(path.join(directory, filename), Buffer.from(match[2], 'base64'));
  return `/uploads/admin/photos/${filename}`;
}

async function getNotificationSettingRow(userId: string, role: Role) {
  return prisma.systemSetting.upsert({
    where: { key: notificationSettingKey(userId) },
    create: {
      key: notificationSettingKey(userId),
      valueJson: role === Role.SUPER_ADMIN ? defaultSuperAdminNotificationValues : defaultNotificationValues,
      updatedBy: userId
    },
    update: {}
  });
}

export async function getAdminProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { staffProfile: true }
  });

  if (!user) {
    throw new ApiError(404, 'Admin profile not found');
  }

  return adminProfile(user);
}

export async function updateAdminProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; photo?: string },
  filePhotoUrl?: string
) {
  const photoUrl = filePhotoUrl ?? (data.photo ? await saveBase64Photo(userId, data.photo) : undefined);
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(photoUrl !== undefined ? { photoUrl } : {})
    },
    include: { staffProfile: true }
  });

  await recordAuditLog({
    actorUserId: userId,
    action: 'SETTINGS_UPDATE',
    entity: 'Settings',
    entityId: userId,
    metadataJson: {
      displayAction: 'Updated',
      module: 'Settings',
      description: 'Admin profile settings updated.',
      status: 'Success'
    }
  });

  return adminProfile(user);
}

export async function deactivateAdminAccount(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    }),
    prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.INACTIVE }
    })
  ]);

  await recordAuditLog({
    actorUserId: userId,
    action: 'STATUS_CHANGE',
    entity: 'Settings',
    entityId: userId,
    metadataJson: {
      displayAction: 'Deleted',
      module: 'Settings',
      description: 'Admin account deactivated.',
      status: 'Success'
    }
  });
}

export async function getNotificationSettings(userId: string, role: Role) {
  const setting = await getNotificationSettingRow(userId, role);
  const values = setting.valueJson as Record<string, unknown>;

  if (role === Role.SUPER_ADMIN) {
    return superAdminNotificationItems.map((item) => {
      const value = values[item.key] as { email?: boolean; dashboard?: boolean } | undefined;
      return { key: item.key, label: item.label, sub: item.sub, email: value?.email !== false, dashboard: value?.dashboard !== false };
    });
  }

  return adminNotificationItems.map((item) => ({ key: item.key, label: item.label, sub: item.sub, enabled: values[item.key] !== false }));
}

export async function updateNotificationSettings(userId: string, role: Role, body: Record<string, boolean | { email?: boolean; dashboard?: boolean }>) {
  const setting = await getNotificationSettingRow(userId, role);
  const currentValues = setting.valueJson as Record<string, unknown>;

  await prisma.systemSetting.update({
    where: { key: notificationSettingKey(userId) },
    data: {
      valueJson: { ...currentValues, ...body } as any,
      updatedBy: userId
    }
  });

  await recordAuditLog({
    actorUserId: userId,
    action: 'SETTINGS_UPDATE',
    entity: 'Settings',
    entityId: userId,
    metadataJson: {
      displayAction: 'Updated',
      module: 'Settings',
      description: 'Notification settings updated.',
      status: 'Success'
    }
  });

  return getNotificationSettings(userId, role);
}

function dateFilter(range?: string, startDate?: Date, endDate?: Date) {
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  if (range === 'Today') {
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return { gte: today, lt: tomorrow };
  }

  if (range === 'Yesterday') {
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return { gte: yesterday, lt: today };
  }

  if (range === 'Last 7 Days' || range === 'Last 30 Days') {
    const days = range === 'Last 7 Days' ? 7 : 30;
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - days);
    return { gte: start };
  }

  if (range === 'This Month') {
    return { gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) };
  }

  if (range === 'Custom Range') {
    return {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {})
    };
  }

  return undefined;
}


function buildSystemLogWhere(query: SystemLogQuery) {
  const createdAt = dateFilter(query.dateRange, query.startDate, query.endDate);
  const and: any[] = [];
  if (createdAt) and.push({ createdAt });
  if (query.actorUserId) and.push({ actorUserId: query.actorUserId });
  if (query.action) and.push({ action: query.action });
  if (query.module) and.push({ module: { equals: query.module, mode: 'insensitive' } });
  if (query.user) {
    and.push({
      OR: [
        { actorName: { contains: query.user, mode: 'insensitive' } },
        { actorEmail: { contains: query.user, mode: 'insensitive' } },
        { actorRole: { contains: query.user, mode: 'insensitive' } }
      ]
    });
  }
  if (query.search) {
    and.push({
      OR: [
        { description: { contains: query.search, mode: 'insensitive' } },
        { module: { contains: query.search, mode: 'insensitive' } },
        { entity: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
        { affectedItem: { contains: query.search, mode: 'insensitive' } },
        { actorName: { contains: query.search, mode: 'insensitive' } },
        { actorEmail: { contains: query.search, mode: 'insensitive' } }
      ]
    });
  }
  return and.length ? { AND: and } : {};
}

function serializeSystemLogEntry(log: any) {
  const actorName = log.actorName ?? (log.actorUser ? [log.actorUser.firstName, log.actorUser.lastName].filter(Boolean).join(' ') || log.actorUser.email : null);
  return {
    id: log.id,
    actor: log.actorUserId || actorName || log.actorEmail ? {
      id: log.actorUserId,
      name: actorName,
      email: log.actorEmail ?? log.actorUser?.email ?? null,
      role: log.actorRole ?? log.actorUser?.role ?? null
    } : null,
    action: log.action,
    module: log.module,
    entityType: log.entity,
    entityId: log.entityId,
    affectedItem: log.affectedItem,
    description: log.description,
    status: log.status,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    metadata: log.metadataJson ?? null,
    createdAt: log.createdAt.toISOString()
  };
}

export async function listSystemLog(query: SystemLogQuery) {
  const where = buildSystemLogWhere(query);
  const [entries, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: { actorUser: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    items: entries.map(serializeSystemLogEntry),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize)
    }
  };
}

export async function getSystemLogById(id: string) {
  const log = await prisma.auditLog.findUnique({ where: { id }, include: { actorUser: true } });
  if (!log) throw new ApiError(404, 'System log not found');
  return serializeSystemLogEntry(log);
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildMinimalPdf(lines: string[]): Buffer {
  const content = `BT /F1 10 Tf 40 760 Td ${lines
    .slice(0, 200)
    .map((line, index) => `${index === 0 ? '' : '0 -14 Td '}(${line.slice(0, 140).replace(/[()\\]/g, '\\$&')}) Tj`)
    .join(' ')} ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`
  ];
  const header = '%PDF-1.4\n';
  const offsets: number[] = [];
  let body = '';
  for (const object of objects) { offsets.push(Buffer.byteLength(header + body)); body += `${object}\n`; }
  const xrefOffset = Buffer.byteLength(header + body);
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(header + body + xref);
}

export async function exportSystemLog(query: Omit<SystemLogQuery, 'page' | 'pageSize'> & { format: 'csv' | 'pdf' }) {
  const rows = await prisma.auditLog.findMany({ where: buildSystemLogWhere(query as unknown as SystemLogQuery), include: { actorUser: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 10000 });
  const serialized = rows.map(serializeSystemLogEntry);
  const filename = `system_log_${new Date().toISOString().slice(0, 10)}.${query.format}`;
  if (query.format === 'csv') {
    return { contentType: 'text/csv; charset=utf-8', filename, body: [
      'Created At,Actor Name,Actor Email,Actor Role,Action,Module,Entity Type,Entity ID,Affected Item,Description,IP Address,Status',
      ...serialized.map((row) => [row.createdAt, row.actor?.name, row.actor?.email, row.actor?.role, row.action, row.module, row.entityType, row.entityId, row.affectedItem, row.description, row.ipAddress, row.status].map(csvEscape).join(','))
    ].join('\n') };
  }
  return { contentType: 'application/pdf', filename, body: buildMinimalPdf(['System Log / Audit Trail', `Exported At: ${new Date().toISOString()}`, ...serialized.map((row) => `${row.createdAt} | ${row.actor?.email ?? 'System'} | ${row.action} | ${row.module} | ${row.description} | ${row.status}`)]) };
}

export async function changeAdminPassword(userId: string, data: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true } });
  if (!user) throw new ApiError(404, 'Admin account not found');
  if (!(await comparePassword(data.currentPassword, user.passwordHash))) throw new ApiError(401, 'Current password is incorrect');

  const passwordHash = await hashPassword(data.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  ]);

  await recordAuditLog({ actorUserId: userId, action: 'SETTINGS_UPDATE', entity: 'Settings', entityId: userId, metadataJson: { displayAction: 'Updated', module: 'Settings', description: 'Admin password changed and active sessions invalidated.', status: 'Success' } });
}

export function getRolesPermissions() { return rolesPermissions; }

export function getMyRolesPermissions(role: Role) {
  if (role === Role.SUPER_ADMIN) return rolesPermissions;
  return { admin: rolesPermissions.admin };
}

export function updateRolesPermissions(input: { admin?: Record<string, boolean>; staff?: Record<string, boolean> }) {
  for (const role of ['admin', 'staff'] as const) {
    const updates = input[role];
    if (!updates) continue;
    for (const permission of rolesPermissions[role]) {
      if (Object.prototype.hasOwnProperty.call(updates, permission.key)) permission.value = Boolean(updates[permission.key]);
    }
  }
  return rolesPermissions;
}
