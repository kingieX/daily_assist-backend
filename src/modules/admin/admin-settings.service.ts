import fs from 'fs/promises';
import path from 'path';
import { AuditAction, Role, User, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { recordAuditLog } from '../operations/audit-log.service';

const notificationItems = [
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

const defaultNotificationValues = Object.fromEntries(notificationItems.map((item) => [item.key, true]));

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

async function getNotificationSettingRow(userId: string) {
  return prisma.systemSetting.upsert({
    where: { key: notificationSettingKey(userId) },
    create: {
      key: notificationSettingKey(userId),
      valueJson: defaultNotificationValues,
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

export async function getNotificationSettings(userId: string) {
  const setting = await getNotificationSettingRow(userId);
  const values = setting.valueJson as Record<string, unknown>;

  return notificationItems.map((item) => ({
    key: item.key,
    label: item.label,
    sub: item.sub,
    enabled: values[item.key] !== false
  }));
}

export async function updateNotificationSettings(userId: string, body: Record<string, boolean>) {
  const setting = await getNotificationSettingRow(userId);
  const currentValues = setting.valueJson as Record<string, boolean>;

  await prisma.systemSetting.update({
    where: { key: notificationSettingKey(userId) },
    data: {
      valueJson: { ...currentValues, ...body },
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

  return getNotificationSettings(userId);
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

function displayAction(action: AuditAction): string {
  const mapping: Record<AuditAction, string> = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    LOGIN: 'Attempted',
    LOGOUT: 'Attempted',
    STATUS_CHANGE: 'Updated',
    SETTINGS_UPDATE: 'Updated',
    REPORT_PROCESSING: 'Approved'
  };
  return mapping[action];
}

function serializeSystemLogEntry(log: any) {
  const metadata = (log.metadataJson ?? {}) as Record<string, string>;
  const actor = log.actorUser as AdminProfileUser | null;
  const userCategory = metadata.userCategory ?? (actor ? titleRole(actor.role) : 'System');
  const actorName = actor ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email : 'System';

  return {
    id: log.id,
    time: log.createdAt.toISOString(),
    user: metadata.user ?? (userCategory === 'System' ? 'System' : `${userCategory} ${actorName}`.trim()),
    action: metadata.displayAction ?? displayAction(log.action),
    module: metadata.module ?? log.entity,
    affectedItem: metadata.affectedItem ?? (log.entityId ? `${log.entity}: ${log.entityId}` : log.entity),
    description: metadata.description ?? `${displayAction(log.action)} ${log.entity}`,
    ipAddress: metadata.ipAddress ?? '',
    status: metadata.status ?? 'Success'
  };
}

function matchesSystemLogFilters(entry: ReturnType<typeof serializeSystemLogEntry>, query: SystemLogQuery): boolean {
  const search = query.search?.toLowerCase();
  return (
    (!query.user || entry.user.includes(query.user)) &&
    (!query.action || entry.action === query.action) &&
    (!query.module || entry.module === query.module) &&
    (!search || `${entry.description} ${entry.action}`.toLowerCase().includes(search))
  );
}

export async function listSystemLog(query: SystemLogQuery) {
  const createdAt = dateFilter(query.dateRange, query.startDate, query.endDate);
  const where = createdAt ? { createdAt } : {};
  const entries = await prisma.auditLog.findMany({
    where,
    include: { actorUser: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });

  const filtered = entries.map(serializeSystemLogEntry).filter((entry) => matchesSystemLogFilters(entry, query));
  const offset = (query.page - 1) * query.pageSize;

  return {
    items: filtered.slice(offset, offset + query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    total: filtered.length
  };
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildMinimalPdf(lines: string[]): Buffer {
  const content = `BT /F1 10 Tf 40 760 Td ${lines
    .slice(0, 80)
    .map((line, index) => `${index === 0 ? '' : '0 -14 Td '}(${line.replace(/[()\\]/g, '\\$&')}) Tj`)
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
  for (const object of objects) {
    offsets.push(Buffer.byteLength(header + body));
    body += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(header + body);
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
    .join('\n')}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(header + body + xref);
}

export async function exportSystemLog(query: Omit<SystemLogQuery, 'page' | 'pageSize'> & { format: 'csv' | 'pdf' }) {
  const rows = (await listSystemLog({ ...query, page: 1, pageSize: 100_000 })).items;

  if (query.format === 'csv') {
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: 'system_log.csv',
      body: [
        'Time,User,Action,Module,Description,Status',
        ...rows.map((row) =>
          [row.time, row.user, row.action, row.module, row.description, row.status].map(csvEscape).join(',')
        )
      ].join('\n')
    };
  }

  return {
    contentType: 'application/pdf',
    filename: 'system_log.pdf',
    body: buildMinimalPdf([
      'System Log',
      ...rows.map((row) => `${row.time} | ${row.user} | ${row.action} | ${row.module} | ${row.description} | ${row.status}`)
    ])
  };
}

export function getRolesPermissions() {
  return rolesPermissions;
}
