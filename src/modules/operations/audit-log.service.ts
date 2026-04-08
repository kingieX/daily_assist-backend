import { prisma } from '../../config/prisma';

const db = prisma as any;

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'STATUS_CHANGE'
  | 'SETTINGS_UPDATE'
  | 'REPORT_PROCESSING';

export async function recordAuditLog(input: {
  actorUserId?: string;
  action: AuditActionType;
  entity: string;
  entityId?: string;
  metadataJson?: Record<string, unknown>;
}) {
  return db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadataJson: input.metadataJson ?? null
    }
  });
}
