import { Role } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error';

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      next(new ApiError(403, 'Forbidden: insufficient permissions'));
      return;
    }

    next();
  };
}
