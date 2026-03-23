import { Router } from 'express';
import { sendSuccess } from '../../utils/api-response';

const healthRouter = Router();

healthRouter.get('/', (_req, res) =>
  sendSuccess(res, 200, 'DailyAssist API is healthy', {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  })
);

export { healthRouter };
