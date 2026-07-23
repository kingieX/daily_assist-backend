import fs from 'fs/promises';
import path from 'path';
import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { recordAuditLog } from '../operations/audit-log.service';

const notificationItems = [
  { key: 'bookingRequest', label: 'Booking Request', sub: 'Notify me when a new booking request is submitted.' },
  { key: 'staffCheckin', label: 'Staff Check-in', sub: 'Notify me when staff check in for visits.' },
  { key: 'staffCheckout', label: 'Staff Checkout', sub: 'Notify me when staff check out from visits.' },
  { key: 'missedCheckin', label: 'Missed Check-in', sub: 'Notify me when staff miss scheduled check-ins.' },
  { key: 'missedCheckout', label: 'Missed Checkout', sub: 'Notify me when staff miss scheduled checkouts.' }
] as const;

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

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(''); }
function titleRole(role: Role) { return role === Role.SUPER_ADMIN ? 'Super Admin' : role === Role.ADMIN ? 'Admin' : 'Support Worker'; }
function statusLabel(status: UserStatus) { return status === UserStatus.ACTIVE ? 'Active' : status === UserStatus.SUSPENDED ? 'Suspended' : 'Deactivated'; }
function formatGender(sex?: string | null) { return sex ? sex.toLowerCase().replace(/(^|_)\w/g, (m) => m.replace('_', ' ').toUpperCase()).replace('Prefer Not To Say','Prefer not to say') : ''; }
function adminProfile(user: any) { const firstName = user.firstName ?? user.staffProfile?.firstName ?? ''; const lastName = user.lastName ?? user.staffProfile?.lastName ?? ''; return { id: user.id, firstName, lastName, email: user.email, role: titleRole(user.role), photoUrl: user.photoUrl ?? user.staffProfile?.photoUrl ?? null }; }

export async function getStaffProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { staffProfile: true } });
  if (!user || !user.staffProfile) throw new ApiError(404, 'Staff profile not found');
  const name = [user.staffProfile.firstName, user.staffProfile.lastName].filter(Boolean).join(' ');
  return { name, initials: initials(name), role: user.staffProfile.staffRoleLabel ?? 'Support Worker', email: user.businessEmail ?? user.email, gender: formatGender(user.staffProfile.sex), phone: user.staffProfile.phone, dob: (user.staffProfile.dateOfBirth?.toISOString().slice(0, 10) ?? user.staffProfile.dobText ?? ''), staffId: user.staffCode ?? user.id, zone: user.staffProfile.zone ?? '', accountStatus: statusLabel(user.status), lastLoginAt: user.lastLoginAt?.toISOString() ?? user.updatedAt.toISOString() };
}

export async function getAdminProfile(userId: string) { const user = await prisma.user.findUnique({ where: { id: userId }, include: { staffProfile: true } }); if (!user) throw new ApiError(404, 'Admin profile not found'); return adminProfile(user); }

async function saveBase64Photo(userId: string, value: string) { const m = value.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/); if (!m) return value; const ext = m[2] === 'jpeg' ? 'jpg' : m[2]; const dir = path.resolve(process.cwd(), 'uploads', 'admin', 'photos'); await fs.mkdir(dir, { recursive: true }); const file = `admin-${userId}-${Date.now()}.${ext}`; await fs.writeFile(path.join(dir, file), Buffer.from(m[3], 'base64')); return `/uploads/admin/photos/${file}`; }

export async function updateAdminProfile(userId: string, data: any, filePhotoUrl?: string) {
  const photoUrl = filePhotoUrl ?? (data.photo ? await saveBase64Photo(userId, data.photo) : undefined);
  const user = await prisma.user.update({ where: { id: userId }, data: { ...(data.firstName !== undefined ? { firstName: data.firstName } : {}), ...(data.lastName !== undefined ? { lastName: data.lastName } : {}), ...(photoUrl !== undefined ? { photoUrl } : {}) }, include: { staffProfile: true } });
  await recordAuditLog({ actorUserId: userId, action: 'SETTINGS_UPDATE', entity: 'Settings', entityId: userId, metadataJson: { displayAction: 'Updated', module: 'Settings', description: 'Admin profile settings updated.', status: 'Success' } });
  return adminProfile(user);
}

export async function deactivateAdminAccount(userId: string) { await prisma.$transaction([prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }), prisma.user.update({ where: { id: userId }, data: { status: UserStatus.INACTIVE } })]); await recordAuditLog({ actorUserId: userId, action: 'STATUS_CHANGE', entity: 'Settings', entityId: userId, metadataJson: { displayAction: 'Deleted', module: 'Settings', description: 'Admin account deactivated.', status: 'Success' } }); }

async function pref(userId: string) { return (prisma as any).systemSetting.upsert({ where: { key: `adminNotificationSettings:${userId}` }, create: { key: `adminNotificationSettings:${userId}`, valueJson: Object.fromEntries(notificationItems.map(i => [i.key, true])), updatedBy: userId }, update: {} }); }
export async function getNotificationSettings(userId: string) { const s = await pref(userId); const vals = s.valueJson as any; return notificationItems.map((i) => ({ ...i, enabled: vals[i.key] !== false })); }
export async function updateNotificationSettings(userId: string, body: Record<string, boolean>) { const current = (await pref(userId)).valueJson as any; await (prisma as any).systemSetting.update({ where: { key: `adminNotificationSettings:${userId}` }, data: { valueJson: { ...current, ...body }, updatedBy: userId } }); await recordAuditLog({ actorUserId: userId, action: 'SETTINGS_UPDATE', entity: 'Settings', entityId: userId, metadataJson: { displayAction: 'Updated', module: 'Settings', description: 'Notification settings updated.', status: 'Success' } }); return getNotificationSettings(userId); }

function dateFilter(range?: string, startDate?: Date, endDate?: Date) { const now = new Date(); const start = new Date(now); start.setUTCHours(0,0,0,0); const end = new Date(start); end.setUTCDate(end.getUTCDate()+1); if (range==='Today') return { gte:start, lt:end }; if (range==='Yesterday') { const y=new Date(start); y.setUTCDate(y.getUTCDate()-1); return { gte:y, lt:start }; } if (range==='Last 7 Days') { const d=new Date(now); d.setUTCDate(d.getUTCDate()-7); return { gte:d }; } if (range==='Last 30 Days') { const d=new Date(now); d.setUTCDate(d.getUTCDate()-30); return { gte:d }; } if (range==='This Month') return { gte:new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) }; if (range==='Custom Range') return { ...(startDate?{gte:startDate}:{}), ...(endDate?{lte:endDate}:{}) }; return undefined; }
function logItem(log:any) { const m=log.metadataJson??{}; const actor=log.actorUser; const user=m.userCategory ?? (actor ? titleRole(actor.role) : 'System'); const actorName=actor ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email : 'System'; return { id: log.id, time: log.createdAt.toISOString(), user: m.user ?? (user==='System' ? 'System' : `${user} ${actorName}`.trim()), action: m.displayAction ?? ({CREATE:'Created',UPDATE:'Updated',DELETE:'Deleted',STATUS_CHANGE:'Updated',SETTINGS_UPDATE:'Updated',LOGIN:'Attempted',LOGOUT:'Attempted',REPORT_PROCESSING:'Approved'} as any)[log.action] ?? log.action, module: m.module ?? log.entity, affectedItem: m.affectedItem ?? (log.entityId ? `${log.entity}: ${log.entityId}` : log.entity), description: m.description ?? `${log.action} ${log.entity}`, ipAddress: m.ipAddress ?? '', status: m.status ?? 'Success' }; }
export async function listSystemLog(q:any) { const createdAt=dateFilter(q.dateRange,q.startDate,q.endDate); const where:any={ ...(createdAt?{createdAt}:{}), ...(q.module?{ OR:[{entity:q.module},{metadataJson:{path:['module'],equals:q.module}}]}:{}) }; const all=(await (prisma as any).auditLog.findMany({ where, include:{ actorUser:true }, orderBy:[{createdAt:'desc'},{id:'desc'}] })).map(logItem).filter((x:any)=> (!q.user || x.user.includes(q.user)) && (!q.action || x.action===q.action) && (!q.module || x.module===q.module) && (!q.search || `${x.description} ${x.action}`.toLowerCase().includes(q.search.toLowerCase()))); const start=(q.page-1)*q.pageSize; return { items: all.slice(start,start+q.pageSize), page:q.page, pageSize:q.pageSize, total: all.length }; }
export async function exportSystemLog(q:any) { const rows=(await listSystemLog({ ...q, page:1, pageSize:100000 })).items; if (q.format==='csv') return { contentType:'text/csv; charset=utf-8', filename:'system_log.csv', body: ['Time,User,Action,Module,Description,Status', ...rows.map((r:any)=>[r.time,r.user,r.action,r.module,r.description,r.status].map((v)=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n') }; const text = rows.map((r:any)=>`${r.time} | ${r.user} | ${r.action} | ${r.module} | ${r.description} | ${r.status}`).join('\n'); return { contentType:'application/pdf', filename:'system_log.pdf', body: Buffer.from(`%PDF-1.1\n1 0 obj <<>> stream\nSystem Log\n${text}\nendstream endobj\n%%EOF`) }; }
export function getRolesPermissions() { return rolesPermissions; }
