import crypto from 'crypto';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { ApiError } from './api-error';

export type TokenType = 'access' | 'refresh';

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: Role;
  typ: TokenType;
  jti?: string;
}

interface AuthSubject {
  id: string;
  email: string;
  role: Role;
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new ApiError(500, `Invalid duration format: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new ApiError(500, `Unsupported duration unit: ${unit}`);
  }
}

function expiresAtFrom(duration: string): Date {
  return new Date(Date.now() + parseDurationToMs(duration));
}

export function getRefreshTokenMaxAgeMs(): number {
  return parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
}

export function signAccessToken(subject: AuthSubject): string {
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    sub: subject.id,
    email: subject.email,
    role: subject.role,
    typ: 'access'
  };

  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn']
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(subject: AuthSubject): { token: string; jti: string; expiresAt: Date } {
  const jti = crypto.randomUUID();
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    sub: subject.id,
    email: subject.email,
    role: subject.role,
    jti,
    typ: 'refresh'
  };

  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']
  };

  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, options);

  return {
    token,
    jti,
    expiresAt: expiresAtFrom(env.JWT_REFRESH_EXPIRES_IN)
  };
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;
  if (payload.typ !== 'access') {
    throw new ApiError(401, 'Invalid access token type');
  }
  return payload;
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthTokenPayload;
  if (payload.typ !== 'refresh') {
    throw new ApiError(401, 'Invalid refresh token type');
  }
  return payload;
}
