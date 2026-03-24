import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/api-error';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      errors: error.details
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(409).json({
      success: false,
      message: 'Database request failed',
      code: error.code
    });
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Uploaded file is too large'
          : 'Invalid file upload request',
      code: error.code
    });
  }

  if (error instanceof Error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
}
