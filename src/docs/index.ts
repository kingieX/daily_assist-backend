import type { OpenAPIV3 } from 'openapi-types';
import { responses } from './components/responses';
import { schemas } from './components/schemas';
import { securitySchemes } from './components/security';
import { authPaths } from './paths/auth.paths';
import { healthPaths } from './paths/health.paths';
import { protectedPaths } from './paths/protected.paths';
import { publicPaths } from './paths/public.paths';

/**
 * DailyAssist OpenAPI 3.0 specification.
 *
 * Convention for updates (per phase):
 *  - Schemas  → src/docs/components/schemas.ts
 *  - Shared responses → src/docs/components/responses.ts
 *  - New module paths → src/docs/paths/<module>.paths.ts  (create one file per module)
 *  - Register the new paths file in the `paths` spread below
 *
 * Phase coverage:
 *  ✅ Phase 1 — Health, Auth (login/refresh/logout/me/admin-check), Protected test route
 *  ✅ Phase 2 — Auth (forgot/reset password), Public catalog (packages, services), Public intake (booking, worker application)
 */
export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',

  info: {
    title: 'DailyAssist API',
    version: '1.0.0',
    description: [
      '## Overview',
      'REST API for **DailyAssist** — a platform connecting clients (especially elderly people',
      'and families) with domestic assistance workers.',
      '',
      '## Base URL',
      'All endpoints are prefixed with `/api/v1`.',
      '',
      '## Authentication',
      'Protected routes require a JWT Bearer token. Obtain one from the login endpoints below.',
      '',
      '**Flow:**',
      '1. `POST /auth/admin/login` or `POST /auth/staff/login` → receive `accessToken` + `refreshToken`',
      '2. Include `Authorization: Bearer <accessToken>` on protected requests',
      '3. When the access token expires (15 min), call `POST /auth/refresh` to rotate the token pair',
      '4. Call `POST /auth/logout` to revoke the session',
      '',
      '## Roles',
      '| Role | Description |',
      '|------|-------------|',
      '| `SUPER_ADMIN` | Full system access |',
      '| `ADMIN` | Full operational access |',
      '| `STAFF` | Limited to own visits, profile, and messaging |',
      '',
      '## Response Envelope',
      'All responses follow a consistent shape:',
      '- **Success:** `{ success: true, message, data? }`',
      '- **Error:** `{ success: false, message, code?, errors? }`'
    ].join('\n')
  },

  servers: [
    {
      url: '/api/v1',
      description: 'Current server (all environments)'
    }
  ],

  tags: [
    {
      name: 'Health',
      description: 'Server status and uptime monitoring'
    },
    {
      name: 'Auth',
      description: 'Authentication — login, token refresh, logout, and session identity'
    },
    {
      name: 'Test',
      description: 'Temporary Phase 1 verification endpoints'
    },
    {
      name: 'Public — Catalog',
      description: 'Public read-only catalog: packages and services (no auth required)'
    },
    {
      name: 'Public — Intake',
      description: 'Public form submissions: booking requests and worker applications (no auth, rate-limited)'
    }
  ],

  components: {
    securitySchemes,
    schemas,
    responses
  },

  paths: {
    ...healthPaths,
    ...authPaths,
    ...protectedPaths,
    ...publicPaths
    // Phase 3+: spread additional path modules here
    // e.g. ...adminBookingPaths, ...adminClientPaths, ...staffPaths
  }
};
