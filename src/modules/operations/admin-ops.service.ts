import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { recordAuditLog } from './audit-log.service';
import type { ReportListQuery } from './admin-ops.validation';

const db = prisma as any;

function paginated<T>(items: T[], total: number, page: number, limit: number) {
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

async function createReport(input: { title: string; description: string; type: string }, actorUserId: string) {
  const report = await db.report.create({
    data: {
      title: input.title,
      description: input.description,
      type: input.type,
      createdBy: actorUserId
    }
  });

  await recordAuditLog({
    actorUserId,
    action: 'CREATE',
    entity: 'report',
    entityId: report.id,
    metadataJson: { type: report.type }
  });

  return report;
}

async function listReports(query: ReportListQuery) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;

  const [total, items] = await Promise.all([
    db.report.count({ where }),
    db.report.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit
    })
  ]);

  return paginated(items, total, page, limit);
}

async function getReportById(id: string) {
  return db.report.findUnique({ where: { id } });
}

async function updateReportStatus(
  id: string,
  input: { status?: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'BILLED'; billingProcessed?: boolean },
  actorUserId: string
) {
  const updated = await db.report.update({
    where: { id },
    data: {
      status: input.status,
      billingProcessed: input.billingProcessed,
      updatedBy: actorUserId
    }
  });

  await recordAuditLog({
    actorUserId,
    action: 'REPORT_PROCESSING',
    entity: 'report',
    entityId: id,
    metadataJson: {
      status: input.status,
      billingProcessed: input.billingProcessed
    }
  });

  return updated;
}

async function deleteReport(id: string, actorUserId: string) {
  const existing = await db.report.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!existing) throw new ApiError(404, 'Report not found');

  await db.report.delete({ where: { id } });

  await recordAuditLog({
    actorUserId,
    action: 'DELETE',
    entity: 'report',
    entityId: id,
    metadataJson: { previousStatus: existing.status }
  });

  return { id, deleted: true };
}

async function listSystemSettings() {
  return db.systemSetting.findMany({ orderBy: { key: 'asc' } });
}

async function upsertSystemSetting(input: { key: string; valueJson: Record<string, unknown> }, actorUserId: string) {
  const setting = await db.systemSetting.upsert({
    where: { key: input.key },
    update: {
      valueJson: input.valueJson,
      updatedBy: actorUserId
    },
    create: {
      key: input.key,
      valueJson: input.valueJson,
      updatedBy: actorUserId
    }
  });

  await recordAuditLog({
    actorUserId,
    action: 'SETTINGS_UPDATE',
    entity: 'system_setting',
    entityId: setting.id,
    metadataJson: { key: setting.key }
  });

  return setting;
}

async function deleteSystemSetting(id: string, actorUserId: string) {
  const existing = await db.systemSetting.findUnique({ where: { id }, select: { id: true, key: true } });
  if (!existing) throw new ApiError(404, 'System setting not found');

  await db.systemSetting.delete({ where: { id } });

  await recordAuditLog({
    actorUserId,
    action: 'DELETE',
    entity: 'system_setting',
    entityId: id,
    metadataJson: { key: existing.key }
  });

  return { id, deleted: true };
}

async function listAuditLogs(query: {
  page: number;
  limit: number;
  action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'STATUS_CHANGE' | 'SETTINGS_UPDATE' | 'REPORT_PROCESSING';
  entity?: string;
}) {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;
  const where: any = {};

  if (query.action) where.action = query.action;
  if (query.entity) where.entity = query.entity;

  const [total, items] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit
    })
  ]);

  return paginated(items, total, page, limit);
}

export const adminOpsService = {
  createReport,
  listReports,
  getReportById,
  updateReportStatus,
  deleteReport,
  listSystemSettings,
  upsertSystemSetting,
  deleteSystemSetting,
  listAuditLogs
};
