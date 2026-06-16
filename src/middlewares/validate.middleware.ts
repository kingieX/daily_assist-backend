import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/api-error';
import { formatValidationError } from '../utils/validation-error';

interface ValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schema: ValidationSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body) as Request['body'];
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query) as Request['query'];
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params) as Request['params'];
      }
      next();
    } catch (error) {
      next(new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', formatValidationError(error)));
    }
  };
}
