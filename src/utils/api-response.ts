import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}
