import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { recordAuditLog } from './audit-log.service';
import type { ReportExportQuery, ReportListQuery, UpdateReportStatusInput } from './admin-ops.validation';

const db = prisma as any;
const reportInclude = {
  staff: { select: { email: true, firstName: true, lastName: true, staffProfile: { select: { firstName: true, lastName: true } } } },
  visit: {
    select: {
      scheduledStartAt: true,
      scheduledEndAt: true,
      booking: {
        select: {
          client: { select: { firstName: true, lastName: true, title: true, address: true } },
          bookingServices: true,
          package: { select: { name: true } },
          selectedPlanSnapshot: true
        }
      }
    }
  }
};

function fullName(entity: any) {
  return [entity?.firstName, entity?.lastName].filter(Boolean).join(' ').trim();
}

function staffName(staff: any) {
  return fullName(staff?.staffProfile) || fullName(staff) || staff?.email || '';
}

function clientName(client: any) {
  return [client?.title, client?.firstName, client?.lastName].filter(Boolean).join(' ').trim();
}

function selectedServices(log: any) {
  const visitTypes = Array.isArray(log.visitTypes) ? log.visitTypes.filter(Boolean) : [];
  if (visitTypes.length) return visitTypes.join(', ');
  if (log.otherService) return log.otherService;
  const services = (log.visit?.booking?.bookingServices ?? []).map((s: any) => s.serviceNameSnapshot).filter(Boolean);
  return services.join(', ') || log.visit?.booking?.package?.name || '';
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).toLowerCase().replace(' ', '');
}

function visitTime(log: any) {
  return `${formatTime(log.visit.scheduledStartAt)} - ${formatTime(log.visit.scheduledEndAt)}`;
}

function summary(log: any) {
  return { id: log.id, date: formatShortDate(log.submittedAt), staff: staffName(log.staff), client: clientName(log.visit.booking.client), service: selectedServices(log), visitTime: visitTime(log), status: log.status };
}

function detail(log: any) {
  return { id: log.id, client: clientName(log.visit.booking.client), address: log.visit.booking.client.address ?? '', service: selectedServices(log), fullDate: formatLongDate(log.submittedAt), startTime: formatTime(log.visit.scheduledStartAt), endTime: formatTime(log.visit.scheduledEndAt), assignedTo: staffName(log.staff), additionalNote: log.notes, status: log.status, reasonForAction: log.reasonForAction ?? '' };
}

function rangeFor(query: Pick<ReportListQuery, 'dateRange' | 'startDate' | 'endDate'>) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  let start: Date | undefined;
  let end: Date | undefined;
  if (query.dateRange === 'Today') { start = startOfDay(now); end = new Date(start); end.setUTCDate(end.getUTCDate() + 1); }
  if (query.dateRange === 'Yesterday') { end = startOfDay(now); start = new Date(end); start.setUTCDate(start.getUTCDate() - 1); }
  if (query.dateRange === 'Last 7 Days') { end = new Date(); start = startOfDay(now); start.setUTCDate(start.getUTCDate() - 6); }
  if (query.dateRange === 'Last 30 Days') { end = new Date(); start = startOfDay(now); start.setUTCDate(start.getUTCDate() - 29); }
  if (query.dateRange === 'This Month') { start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)); }
  if (query.dateRange === 'Custom Range') {
    if (query.startDate) start = new Date(`${query.startDate}T00:00:00.000Z`);
    if (query.endDate) end = new Date(`${query.endDate}T23:59:59.999Z`);
  }
  return { start, end };
}

function whereFor(query: Partial<ReportListQuery>) {
  const where: any = {};
  const { start, end } = rangeFor(query as any);
  if (start || end) where.submittedAt = { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
  return where;
}

function filterInMemory(rows: any[], query: Partial<ReportListQuery>) {
  return rows.filter((log) => {
    const row = summary(log);
    if (query.staff && row.staff !== query.staff) return false;
    if (query.client && row.client !== query.client) return false;
    if (query.service && row.service !== query.service) return false;
    if (query.search) {
      const needle = query.search.toLowerCase();
      if (![row.staff, row.client, row.service].some((value) => value.toLowerCase().includes(needle))) return false;
    }
    return true;
  });
}

async function filteredReports(query: Partial<ReportListQuery>) {
  const rows = await db.visitLog.findMany({ where: whereFor(query), include: reportInclude, orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }] });
  return filterInMemory(rows, query);
}

async function listReports(query: ReportListQuery) {
  const page = query.page;
  const pageSize = query.pageSize;
  const rows = await filteredReports(query);
  const start = (page - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize).map(summary), page, pageSize, total: rows.length };
}

async function listReportFilters() {
  const rows = await filteredReports({});
  return {
    staff: [...new Set(rows.map((log) => staffName(log.staff)).filter(Boolean))].sort(),
    clients: [...new Set(rows.map((log) => clientName(log.visit.booking.client)).filter(Boolean))].sort(),
    services: [...new Set(rows.map(selectedServices).filter(Boolean))].sort()
  };
}

async function getReportById(id: string) {
  const log = await db.visitLog.findUnique({ where: { id }, include: reportInclude });
  return log ? detail(log) : null;
}

async function updateReportStatus(id: string, input: UpdateReportStatusInput, actorUserId: string) {
  const existing = await db.visitLog.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new ApiError(404, 'Report not found');
  const log = await db.visitLog.update({ where: { id }, data: { status: input.status, reasonForAction: input.reasonForAction ?? '' }, include: reportInclude });
  await recordAuditLog({ actorUserId, action: 'REPORT_PROCESSING', entity: 'visit_log_report', entityId: id, metadataJson: { status: input.status, reasonForAction: input.reasonForAction ?? '' } });
  return detail(log);
}

function escapeCsv(value: string) { return `"${value.replace(/"/g, '""')}"`; }
function statusLabel(status: string) { return status.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' '); }
function buildPdf(rows: ReturnType<typeof summary>[]) {
  const text = ['Reports', ...rows.map((r) => `${r.date} | ${r.staff} | ${r.client} | ${r.service} | ${r.visitTime} | ${statusLabel(r.status)}`)].join('\n');
  const escaped = text.replace(/[()\\]/g, '\\$&').replace(/\n/g, ') Tj T* (');
  const stream = `BT /F1 12 Tf 50 760 Td (${escaped}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) { offsets.push(Buffer.byteLength(pdf)); pdf += `${object}\n`; }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n');
  pdf += `\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

async function exportReports(query: ReportExportQuery) {
  const rows = (await filteredReports(query)).map(summary);
  if (query.format === 'csv') {
    const header = 'Date, Staff, Client, Service, Visit Time, Status';
    const lines = rows.map((r) => [r.date, r.staff, r.client, r.service, r.visitTime, statusLabel(r.status)].map(escapeCsv).join(','));
    return { filename: 'reports.csv', contentType: 'text/csv', body: [header, ...lines].join('\n') };
  }
  return { filename: 'reports.pdf', contentType: 'application/pdf', body: buildPdf(rows) };
}

export const adminOpsService = { listReports, listReportFilters, getReportById, updateReportStatus, exportReports };
