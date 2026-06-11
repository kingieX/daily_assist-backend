import type { OpenAPIV3 } from 'openapi-types';
import { responses } from './components/responses';
import { schemas } from './components/schemas';
import { securitySchemes } from './components/security';
import { authPaths } from './paths/auth.paths';
import { adminPaths } from './paths/admin.paths';
import { healthPaths } from './paths/health.paths';
import { protectedPaths } from './paths/protected.paths';
import { publicPaths } from './paths/public.paths';
import { visitPaths } from './paths/visits.paths';
import { communicationsPaths } from './paths/communications.paths';
import { operationsPaths } from './paths/operations.paths';
import { withEndpointGuides } from './utils';

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
 *  ✅ Phase 3 — Admin operations (dashboard, bookings, clients, staff, recruitment conversion)
 *  ✅ Phase 4 — Visits admin/staff lifecycle endpoints, event logging, and staff dashboard summary
 *  ✅ Phase 5 — communications routes (messages, announcements, notifications + close-out controls)
 *  🚧 Phase 6 started — reports, system settings, and audit log endpoints
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
    },
    {
      name: 'Admin — Dashboard',
      description: 'Admin dashboard summary, charts, and alert widgets'
    },
    {
      name: 'Admin — Bookings',
      description: 'Admin booking operations: list, detail, assign, and cancel'
    },
    {
      name: 'Admin — Clients',
      description: 'Admin client management: create, read, update, delete'
    },
    {
      name: 'Admin — Staff',
      description: 'Admin staff account provisioning and profile management'
    },
    {
      name: 'Admin — Recruitment',
      description: 'Recruitment review pipeline and applicant-to-staff conversion'
    },
    {
      name: 'Admin — Visits',
      description: 'Admin visit lifecycle operations: create, edit, reassign, cancel'
    },
    {
      name: 'Staff — Visits',
      description: 'Staff visit lifecycle actions: acknowledge, check-in, check-out, history'
    },
    {
      name: 'Admin — Communications',
      description: 'Admin messaging, announcements, and notification history operations'
    },
    {
      name: 'Staff — Communications',
      description: 'Staff messaging, announcement reads, and notification actions'
    },
    {
      name: 'Admin — Phase 6 Ops',
      description: 'Reports, system settings, and audit log operations'
    },
  ],

  components: {
    securitySchemes,
    schemas,
    responses
  },

  paths: withEndpointGuides({
    ...healthPaths,
    ...authPaths,
    ...protectedPaths,
    ...publicPaths,
    ...adminPaths,
    ...visitPaths,
    ...communicationsPaths,
    ...operationsPaths
    // Phase 3+: spread additional path modules here
    // e.g. ...adminBookingPaths, ...adminClientPaths, ...staffPaths
  })
};
