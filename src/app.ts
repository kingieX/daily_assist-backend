import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/not-found.middleware';
import { v1Router } from './routes/v1.routes';

function getCorsOrigin(): boolean | string[] {
  if (env.CORS_ORIGIN === '*') {
    return true;
  }

  return env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
}

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: getCorsOrigin(),
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.use('/api/v1', v1Router);

app.use(notFoundHandler);
app.use(errorHandler);
