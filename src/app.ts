import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { openApiSpec } from './docs';
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
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/api/v1', v1Router);

// Swagger UI — disable helmet's CSP for this route so the UI assets load correctly
app.use(
  '/api/docs',
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'DailyAssist API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true
    }
  })
);

app.use(notFoundHandler);
app.use(errorHandler);
