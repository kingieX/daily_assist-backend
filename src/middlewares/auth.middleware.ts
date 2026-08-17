import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error';
import { verifyAccessToken } from '../utils/jwt';
import { normalizeRole } from '../utils/roles';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new ApiError(401, 'Missing or invalid Authorization header'));
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const payload = verifyAccessToken(token);
    const role = normalizeRole(payload.role);
    if (!role) {
      next(new ApiError(401, 'Invalid access token role'));
      return;
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role
    };
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired access token', 'UNAUTHORIZED', error));
  }
}
