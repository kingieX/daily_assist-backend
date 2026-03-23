import { NextFunction, Request, Response } from 'express';

type AsyncHandlerFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncHandlerFn) => (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
