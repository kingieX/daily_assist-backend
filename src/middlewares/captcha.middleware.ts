import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/api-error';

type CaptchaVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

function resolveCaptchaToken(req: Request): string | undefined {
  const headerToken = req.header('x-captcha-token')?.trim();
  if (headerToken) return headerToken;

  const bodyToken = typeof req.body?.captchaToken === 'string' ? req.body.captchaToken.trim() : '';
  if (bodyToken) return bodyToken;

  return undefined;
}

export async function requireCaptcha(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!env.CAPTCHA_SECRET) {
    logger.warn('CAPTCHA_SECRET not configured; captcha checks are currently disabled');
    next();
    return;
  }

  const token = resolveCaptchaToken(req);
  if (!token) {
    next(new ApiError(400, 'Captcha token is required'));
    return;
  }

  const params = new URLSearchParams({
    secret: env.CAPTCHA_SECRET,
    response: token
  });

  if (req.ip) {
    params.set('remoteip', req.ip);
  }

  try {
    const response = await fetch(env.CAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      throw new ApiError(502, 'Captcha verification service unavailable');
    }

    const payload = (await response.json()) as CaptchaVerifyResponse;
    if (!payload.success) {
      logger.warn({ errorCodes: payload['error-codes'] ?? [] }, 'Captcha verification failed');
      throw new ApiError(400, 'Captcha verification failed');
    }

    next();
  } catch (error) {
    next(error);
  }
}
