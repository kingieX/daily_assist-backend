import { prisma } from '../../config/prisma';
import { getAuditContext } from './audit-context';

const db = prisma as any;

export type AuditStatus = 'SUCCESS' | 'FAILURE';
export type AuditActionType =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'STATUS_CHANGE' | 'SETTINGS_UPDATE' | 'REPORT_PROCESSING'
  | 'FAILED_LOGIN' | 'PASSWORD_RESET' | 'PASSWORD_CHANGE' | 'CONFIRM' | 'CANCEL' | 'ASSIGN' | 'ACTIVATE' | 'DEACTIVATE';

const sensitiveKeys = new Set(['password', 'newPassword', 'currentPassword', 'confirmPassword', 'token', 'refreshToken', 'accessToken', 'secret', 'passwordHash']);

function sanitize(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !sensitiveKeys.has(key) && !key.toLowerCase().includes('password') && !key.toLowerCase().includes('token'))
      .map(([key, val]) => [key, sanitize(val)])
  );
}

function actorName(actor: any): string | null {
  if (!actor) return null;
  return [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email || null;
}

export async function recordAuditLog(input: {
  actorUserId?: string | null;
  action: AuditActionType;
  module?: string;
  entity?: string;
  entityType?: string;
  entityId?: string | null;
  affectedItem?: string | null;
  description?: string;
  status?: AuditStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadataJson?: Record<string, unknown>;
}) {
  const context = getAuditContext();
  const actor = input.actorUserId
    ? await prisma.user.findUnique({ where: { id: input.actorUserId }, select: { email: true, firstName: true, lastName: true, role: true } })
    : null;
  const entity = input.entityType ?? input.entity ?? 'System';
  const module = input.module ?? String(input.metadataJson?.module ?? entity);
  const description = input.description ?? String(input.metadataJson?.description ?? `${input.action} ${entity}`);

  return db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorEmail: actor?.email ?? (input.metadataJson?.actorEmail as string | undefined) ?? null,
      actorName: actorName(actor) ?? (input.metadataJson?.actorName as string | undefined) ?? null,
      actorRole: actor?.role ?? (input.metadataJson?.actorRole as string | undefined) ?? null,
      action: input.action,
      module,
      entity,
      entityId: input.entityId ?? null,
      affectedItem: input.affectedItem ?? (input.metadataJson?.affectedItem as string | undefined) ?? null,
      description,
      status: input.status ?? (input.metadataJson?.status === 'Failure' ? 'FAILURE' : 'SUCCESS'),
      ipAddress: input.ipAddress ?? context.ipAddress ?? (input.metadataJson?.ipAddress as string | undefined) ?? null,
      userAgent: input.userAgent ?? context.userAgent ?? null,
      metadataJson: sanitize(input.metadataJson ?? null)
    }
  });
}
