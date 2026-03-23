import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/api-error';
import { hashValue } from '../../utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../../utils/jwt';
import { comparePassword } from '../../utils/password';

interface LoginInput {
  email: string;
  password: string;
  allowedRoles: Role[];
}

interface SessionResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
    status: UserStatus;
  };
}

async function persistRefreshToken(
  userId: string,
  jti: string,
  refreshToken: string,
  expiresAt: Date
): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      userId,
      jti,
      tokenHash: hashValue(refreshToken),
      expiresAt
    }
  });
}

async function issueSession(user: {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
}): Promise<SessionResult> {
  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  const refresh = signRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  await persistRefreshToken(user.id, refresh.jti, refresh.token, refresh.expiresAt);

  return {
    accessToken,
    refreshToken: refresh.token,
    user
  };
}

async function login(input: LoginInput): Promise<SessionResult> {
  const normalizedEmail = input.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      passwordHash: true
    }
  });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new ApiError(403, 'User account is not active');
  }

  if (!input.allowedRoles.includes(user.role)) {
    throw new ApiError(403, 'Unauthorized for this login endpoint');
  }

  const passwordMatches = await comparePassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return issueSession({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status
  });
}

async function refreshSession(refreshToken: string): Promise<SessionResult> {
  const payload = verifyRefreshToken(refreshToken);

  if (!payload.jti) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { jti: payload.jti },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true
        }
      }
    }
  });

  if (!storedToken) {
    throw new ApiError(401, 'Refresh token not found');
  }

  if (storedToken.revokedAt) {
    throw new ApiError(401, 'Refresh token has been revoked');
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, 'Refresh token has expired');
  }

  if (storedToken.userId !== payload.sub) {
    throw new ApiError(401, 'Invalid refresh token subject');
  }

  const incomingTokenHash = hashValue(refreshToken);
  if (incomingTokenHash !== storedToken.tokenHash) {
    throw new ApiError(401, 'Refresh token hash mismatch');
  }

  if (storedToken.user.status !== UserStatus.ACTIVE) {
    throw new ApiError(403, 'User account is not active');
  }

  const nextSession = await issueSession({
    id: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role,
    status: storedToken.user.status
  });

  const decodedNext = verifyRefreshToken(nextSession.refreshToken);

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: {
      revokedAt: new Date(),
      replacedByJti: decodedNext.jti ?? null
    }
  });

  return nextSession;
}

async function logout(refreshToken: string): Promise<void> {
  const payload = verifyRefreshToken(refreshToken);

  if (!payload.jti) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  await prisma.refreshToken.updateMany({
    where: {
      jti: payload.jti,
      userId: payload.sub,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

export const authService = {
  login,
  refreshSession,
  logout
};
