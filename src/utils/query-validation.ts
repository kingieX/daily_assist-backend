import { z } from 'zod';

export function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function optionalQueryEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(emptyStringToUndefined, z.enum(values).optional());
}

export function optionalQueryUuid(message = 'Invalid ID') {
  return z.preprocess(emptyStringToUndefined, z.string().uuid(message).optional());
}

export function queryPage(defaultValue = 1) {
  return z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(1).default(defaultValue));
}

export function queryLimit(defaultValue = 20) {
  return z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(1).max(100).default(defaultValue));
}

export function optionalQueryBoolean() {
  return z.preprocess(emptyStringToUndefined, z.coerce.boolean().optional());
}

export function optionalQueryString() {
  return z.preprocess(emptyStringToUndefined, z.string().optional());
}
