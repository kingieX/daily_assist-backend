import { AsyncLocalStorage } from 'async_hooks';
import type { Request, Response, NextFunction } from 'express';

type AuditRequestContext = { ipAddress?: string; userAgent?: string };

const storage = new AsyncLocalStorage<AuditRequestContext>();

export function auditContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim() || req.ip;
  storage.run({ ipAddress, userAgent: req.get('user-agent') }, next);
}

export function getAuditContext(): AuditRequestContext {
  return storage.getStore() ?? {};
}
