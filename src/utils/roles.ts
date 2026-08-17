import { Role } from '@prisma/client';

export function normalizeRole(value: unknown): Role | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === Role.ADMIN) return Role.ADMIN;
  if (normalized === Role.SUPER_ADMIN) return Role.SUPER_ADMIN;
  if (normalized === Role.STAFF) return Role.STAFF;
  return null;
}

export function isAdminRole(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}
