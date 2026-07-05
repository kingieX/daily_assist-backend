import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/api-error';
import { formatValidationError } from '../utils/validation-error';

interface ValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function setValidatedRequestValue<Key extends 'body' | 'query' | 'params'>(
  req: Request,
  key: Key,
  value: Request[Key]
): void {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true
  });
}

export function validate(schema: ValidationSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        setValidatedRequestValue(req, 'body', schema.body.parse(req.body) as Request['body']);
      }
      if (schema.query) {
        setValidatedRequestValue(req, 'query', schema.query.parse(req.query) as Request['query']);
      }
      if (schema.params) {
        setValidatedRequestValue(req, 'params', schema.params.parse(req.params) as Request['params']);
      }
      next();
    } catch (error) {
      next(new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', formatValidationError(error)));
    }
  };
}
