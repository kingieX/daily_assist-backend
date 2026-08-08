# Communications, Messages, Notifications, Alerts, Email Worker, and WebSocket Plan

## Purpose

This document is a planning outline only. It does **not** propose starting implementation until product/engineering gives explicit approval.

The goal is to rationalize the current communications surface so that:

1. Staff alerts that already work remain untouched.
2. Chat/message endpoints live under a dedicated **Messages** section instead of being split across admin/staff communications sections.
3. Notification endpoints live under a dedicated **Notifications** section and consistently respect both email and dashboard notification settings.
4. Admin dashboard alerts are treated as a dashboard projection of notifications rather than a separate competing system.
5. A background worker owns notification fan-out and email delivery.
6. A WebSocket gateway owns real-time chat/message delivery and real-time notification/alert updates.

## Current State Inventory

### Routing structure

Current API route mounting is centralized in `src/routes/v1.routes.ts`:

- `/admin` is mounted to `adminRouter`.
- `/staff` is mounted to `staffRouter`.
- Communications routes are currently mounted beneath those role roots, not as a standalone router.

Inside the admin router, `adminCommunicationsRouter` is mounted at `/admin/*`, which means its paths become `/admin/messages`, `/admin/announcements`, and `/admin/notifications/*`.

Inside the staff router, `staffCommunicationsRouter` is mounted at `/staff/*`, which means its paths become `/staff/messages`, `/staff/announcements`, and `/staff/notifications/*`.

### Current admin communications endpoints

The admin communications router currently mixes message/chat, announcement, and notification concerns:

#### Admin message/chat endpoints currently in admin communications

These should move out of the admin communications section and into the dedicated **Messages** section:

- `GET /admin/messages`
- `POST /admin/messages`
- `DELETE /admin/messages`
- `POST /admin/messages/threads`
- `GET /admin/messages/threads`
- `GET /admin/messages/threads/:id/messages`
- `POST /admin/messages/threads/:id/messages`
- `GET /admin/messages/:id`
- `POST /admin/messages/:id/reply`
- `DELETE /admin/messages/:id`

#### Admin announcement endpoints currently in admin communications

These can remain in the **Admin — Communications** section because announcements are broadcast communications rather than direct chat:

- `GET /admin/announcements`
- `POST /admin/announcements`
- `DELETE /admin/announcements/:id`

#### Admin notification endpoints currently in admin communications

These should move to a dedicated **Notifications** section:

- `GET /admin/notifications/history`
- `DELETE /admin/notifications/:id`
- `GET /admin/notifications/preferences`
- `PATCH /admin/notifications/preferences`

### Current staff communications endpoints

The staff communications router also mixes message/chat, announcement, and notification concerns:

#### Staff message/chat endpoints currently in staff communications

These should move out of the staff communications section and into the dedicated **Messages** section:

- `GET /staff/messages`
- `POST /staff/messages/threads`
- `GET /staff/messages/threads`
- `GET /staff/messages/threads/:id/messages`
- `POST /staff/messages/threads/:id/messages`
- `GET /staff/messages/:id`
- `POST /staff/messages/:id/reply`
- `DELETE /staff/messages/:id`

#### Staff announcement endpoints currently in staff communications

These can remain in the **Staff — Communications** section:

- `GET /staff/announcements`
- `PATCH /staff/announcements/:id/read`
- `POST /staff/announcements/:id/acknowledge`

#### Staff notification endpoints currently in staff communications

These should move to a dedicated **Notifications** section:

- `GET /staff/notifications`
- `PATCH /staff/notifications/:id/read`
- `GET /staff/notifications/preferences`
- `PATCH /staff/notifications/preferences`

### Current dashboard alert endpoints

Admin dashboard alerts are already backed by rows in the `notifications` table and surfaced through the admin dashboard section:

- `GET /admin/dashboard/alerts`
- `PATCH /admin/dashboard/alerts/:id/read`
- `PATCH /admin/dashboard/alerts/read-all`

These should remain in the admin dashboard section for UI compatibility, but the implementation should explicitly treat them as a filtered/projection view over notifications.

### Current data model

Relevant existing models:

- `Conversation` stores admin/staff chat threads.
- `Message` stores chat messages.
- `Announcement` stores broadcast communications.
- `AnnouncementRecipient` stores staff-specific read/acknowledgement state.
- `Notification` stores in-app/dashboard notification rows.
- `NotificationPreference` stores per-user channel/category preferences with:
  - `emailEnabled`
  - `inAppEnabled`
  - `messageEnabled`
  - `announcementEnabled`
  - `visitEnabled`
  - `systemEnabled`

There is also a separate admin profile notification-settings surface stored in `SystemSetting` under keys like `adminNotificationSettings:{userId}`. Those settings currently include event-specific controls such as booking requests, staff check-in/out, missed check-in/out, and super-admin account events.

## Target Information Architecture

### 1. Messages section

Create a dedicated **Messages** API/documentation section for chat and inbox endpoints.

Recommended endpoint families:

#### Admin-facing message endpoints

Keep URLs stable for the frontend unless a breaking API version is planned, but tag and document these under **Messages** only:

- `GET /admin/messages`
- `POST /admin/messages`
- `DELETE /admin/messages`
- `GET /admin/messages/:id`
- `POST /admin/messages/:id/reply`
- `DELETE /admin/messages/:id`
- `POST /admin/messages/threads`
- `GET /admin/messages/threads`
- `GET /admin/messages/threads/:id/messages`
- `POST /admin/messages/threads/:id/messages`

#### Staff-facing message endpoints

Also keep URLs stable unless API versioning is planned, but tag and document these under **Messages** only:

- `GET /staff/messages`
- `GET /staff/messages/:id`
- `POST /staff/messages/:id/reply`
- `DELETE /staff/messages/:id`
- `POST /staff/messages/threads`
- `GET /staff/messages/threads`
- `GET /staff/messages/threads/:id/messages`
- `POST /staff/messages/threads/:id/messages`

#### Message service changes to plan

- Extract message/chat logic from the current communications module into a focused messages module.
- Keep conversation authorization rules:
  - Staff can only access conversations where `conversation.staffId === req.user.id`.
  - Admin and super-admin users can access admin/staff conversations.
- Add consistent message read receipts if the frontend needs unread counts.
- Add attachment upload support if attachments should be first-class rather than accepting only `attachmentUrl`.
- Normalize response shapes between admin and staff where possible.
- Keep inbox projections as read models over conversations, announcements, and notifications only if the UI still needs a unified inbox. Otherwise split chat inbox from notification feed.

### 2. Communications section

After moving message/chat endpoints out, the communications sections should focus on announcements and other non-chat broadcast workflows.

#### Admin — Communications

Keep:

- `GET /admin/announcements`
- `POST /admin/announcements`
- `DELETE /admin/announcements/:id`

Potential additions after approval:

- `GET /admin/announcements/:id`
- `PATCH /admin/announcements/:id`
- `POST /admin/announcements/:id/resend`
- `GET /admin/announcements/:id/recipients`

#### Staff — Communications

Keep:

- `GET /staff/announcements`
- `PATCH /staff/announcements/:id/read`
- `POST /staff/announcements/:id/acknowledge`

Potential additions after approval:

- `GET /staff/announcements/:id`
- `GET /staff/announcements/unread-count`

### 3. Notifications section

Create a dedicated **Notifications** API/documentation section for notification history, read state, deletion, preferences, and dashboard alert compatibility.

Recommended endpoint families:

#### Admin notification endpoints

Prefer one consistent naming pattern. Existing URLs can remain stable:

- `GET /admin/notifications/history`
- `DELETE /admin/notifications/:id`
- `GET /admin/notifications/preferences`
- `PATCH /admin/notifications/preferences`

Recommended additions:

- `GET /admin/notifications/unread-count` — implemented
- `PATCH /admin/notifications/:id/read` — implemented
- `PATCH /admin/notifications/read-all` — implemented

#### Staff notification endpoints

Keep existing URLs and tag under **Notifications**:

- `GET /staff/notifications`
- `PATCH /staff/notifications/:id/read`
- `GET /staff/notifications/preferences`
- `PATCH /staff/notifications/preferences`

Recommended additions:

- `DELETE /staff/notifications/:id` — implemented
- `GET /staff/notifications/unread-count` — implemented
- `PATCH /staff/notifications/read-all` — implemented

### 4. Admin dashboard alerts

Keep the existing dashboard alert endpoints because the admin dashboard already uses them:

- `GET /admin/dashboard/alerts`
- `PATCH /admin/dashboard/alerts/:id/read`
- `PATCH /admin/dashboard/alerts/read-all`

Plan the implementation as a compatibility projection over notifications:

- `Notification.type === VISIT` maps to warning-style dashboard alerts.
- `Notification.type === MESSAGE` maps to info-style dashboard alerts.
- `Notification.type === SYSTEM` and other operational notifications map to general/yellow dashboard alerts.
- Dashboard alert read state should update the same `Notification.readAt` field used by the notification feed.
- The notification worker should create these notification rows only if the target user's dashboard/in-app preferences allow it.

## Notification Settings and Preference Strategy

There are currently two preference concepts that need to be reconciled carefully.

### User-level notification preferences

`NotificationPreference` is the best fit for broad user-level category/channel controls:

- Email on/off: `emailEnabled`
- Dashboard/in-app on/off: `inAppEnabled`
- Message category on/off: `messageEnabled`
- Announcement category on/off: `announcementEnabled`
- Visit category on/off: `visitEnabled`
- System category on/off: `systemEnabled`

Use this as the primary preference table for both staff and admin notification fan-out.

### Admin notification-settings page

`GET /admin/notification-settings` and `PATCH /admin/notification-settings` currently expose more specific admin dashboard settings, such as:

- Booking request
- Staff check-in
- Staff checkout
- Missed check-in
- Missed checkout
- Super-admin account sign-in
- Super-admin account information changes

Plan to treat these as event-level overrides for admin recipients.

A notification should be delivered only when both layers allow it:

1. The broad category/channel is enabled in `NotificationPreference`.
2. The specific admin event setting is enabled in `SystemSetting` for that admin, where applicable.

Example:

- A missed check-in alert should create a dashboard notification only if:
  - `NotificationPreference.inAppEnabled === true`
  - `NotificationPreference.visitEnabled === true`
  - `adminNotificationSettings:{userId}.missedCheckin.dashboard !== false`
- It should send an email only if:
  - `NotificationPreference.emailEnabled === true`
  - `NotificationPreference.visitEnabled === true`
  - `adminNotificationSettings:{userId}.missedCheckin.email !== false`, if the event setting supports email/dashboard channel separation.

### Preference decisions for implementation

- Normalize regular admin settings to the same `{ email, dashboard }` shape used by super-admin settings. During migration/backward compatibility, a legacy boolean should be interpreted as both channels using the same value, e.g. `true` becomes `{ email: true, dashboard: true }` and `false` becomes `{ email: false, dashboard: false }`.
- Staff should use the broad `message`, `announcement`, `visit`, and `system` category preferences for the first implementation. Event-level staff settings can be added later only if product requirements call for finer control, such as separate rota-change, visit-reminder, cancellation, or reassignment preferences.
- Announcement behavior should not change as part of this implementation. Keep the existing announcement routes and delivery behavior untouched unless a separate announcement-specific change is explicitly approved.

## Notification Worker Plan

### Worker responsibilities

Create a worker that owns asynchronous delivery and fan-out for notifications and email. The HTTP request path should write durable intent records quickly, then the worker should perform delivery.

Responsibilities:

1. Consume notification jobs from a durable queue.
2. Resolve recipients.
3. Evaluate notification preferences.
4. Create dashboard/in-app `Notification` rows.
5. Send emails when enabled.
6. Emit WebSocket events for connected users after durable writes.
7. Retry transient email or WebSocket fan-out failures.
8. Record delivery attempts and failures for audit/debugging.

### Queue/job types

Recommended job types:

- `message.created`
- `announcement.created`
- `visit.assigned`
- `visit.reassigned`
- `visit.cancelled`
- `visit.checkin.completed`
- `visit.checkout.completed`
- `visit.checkin.missed`
- `visit.checkout.missed`
- `booking.requested`
- `report.submitted`
- `account.signin`
- `account.info_changed`
- `system.alert`

### Delivery flow

For each job:

1. Load event payload and actor.
2. Resolve recipients by role, staff assignment, zone, car ownership, or explicit recipient IDs.
3. Load each recipient's `NotificationPreference` row, creating defaults if absent.
4. For admin recipients, load `adminNotificationSettings:{userId}` when the event maps to one of those settings.
5. Create `Notification` rows for recipients whose dashboard/in-app preferences allow it.
6. Send email for recipients whose email preferences allow it.
7. Publish WebSocket events for online recipients.
8. Store delivery state for future observability.

### Delivery tracking model to consider

The current `Notification` table tracks only in-app rows. It does not track email delivery attempts. Add a separate delivery table when implementing the worker so support/debugging can inspect asynchronous delivery state:

- `NotificationDelivery`
  - `id`
  - `notificationId` nullable for email-only events
  - `userId`
  - `channel`: `DASHBOARD`, `EMAIL`, `WEBSOCKET`
  - `status`: `PENDING`, `SENT`, `FAILED`, `SKIPPED`
  - `reason`
  - `attemptCount`
  - `lastAttemptAt`
  - `createdAt`
  - `updatedAt`

Add this model with the worker implementation rather than during the behavior-preserving route extraction.

### Worker technology decision

Production decision:

- Use BullMQ + Redis for production-grade delayed jobs, retries, and missed-check scheduling.
- A simple in-process worker may be kept for local development only if needed, but it should not be the production delivery mechanism.
- Revisit a PostgreSQL-backed queue only if Redis becomes a deployment blocker.

## WebSocket Plan for Chat and Live Notifications

### Purpose

The WebSocket layer should support:

- Real-time chat messages.
- Message read receipts and typing indicators, if required.
- Live notification feed updates.
- Live admin dashboard alert updates.

### Authentication

- Use the same JWT access token as REST endpoints.
- Authenticate during socket connection.
- Attach `{ userId, role }` to the socket context.
- Reject inactive users.

### Room design

Recommended rooms:

- `user:{userId}` for private notifications and alerts.
- `conversation:{conversationId}` for chat thread events.
- `role:admin` for admin-wide operational alerts when appropriate.
- `role:super-admin` for super-admin-only events when appropriate.
- `staff:{staffId}` only if a staff-specific alias is useful; otherwise use `user:{userId}`.

### WebSocket events

Client-to-server events:

- `conversation:join`
- `conversation:leave`
- `message:send` is deferred; initial implementation continues using REST for durable writes and sockets only for delivery.
- `message:typing:start`
- `message:typing:stop`
- `message:read`
- `notification:read`

Server-to-client events:

- `message:created`
- `message:updated`
- `message:deleted`
- `message:read`
- `message:typing`
- `notification:created`
- `notification:read`
- `notification:deleted`
- `notification:unread_count`
- `alert:created`
- `alert:read`
- `alert:unread_count`

### Recommended write pattern

Use REST for durable writes in the initial implementation:

1. Client calls REST endpoint to send a message or perform a notification action.
2. API writes to database in a transaction.
3. API enqueues notification/email jobs where needed.
4. API or worker emits WebSocket events after commit.

This avoids losing messages if a WebSocket connection drops and keeps authorization consistent.

## Proposed Refactor Phases

### Phase 1 — Documentation and API taxonomy

No behavior changes.

- Move OpenAPI message/chat documentation under **Messages**.
- Move notification documentation under **Notifications**.
- Keep announcement endpoints under **Admin — Communications** and **Staff — Communications**.
- Mark existing admin/staff message endpoints as owned by the messages domain even if URLs remain `/admin/messages` and `/staff/messages`.
- Document dashboard alerts as notification-backed projections.

### Phase 2 — Module extraction without route changes

Behavior-preserving refactor.

- Create a messages module for message controllers/routes/service logic.
- Create a notifications module for notification controllers/routes/service logic.
- Keep existing URL paths to avoid frontend disruption.
- Remove message route declarations from admin/staff communications routers and register them through the new messages router.
- Remove notification route declarations from admin/staff communications routers and register them through the new notifications router.
- Keep announcement routes in communications routers.

### Phase 3 — Notification event abstraction

- Add a notification event service with a single entry point like `enqueueNotificationEvent(eventType, payload)`.
- Replace direct `notification.create` calls in message and announcement flows with notification events.
- Keep staff alert code unchanged unless it needs to publish notification events.
- Connect admin dashboard alert-producing workflows to the notification event service.

### Phase 4 — Worker and email delivery

- Add queue infrastructure. — implemented with BullMQ + Redis when `REDIS_URL` is configured, with the in-process queue retained as a local/test fallback.
- Add notification worker process entry point. — implemented.
- Add email templates per event category. — generic notification email sender implemented; event-specific copy can be added per product wording.
- Enforce `NotificationPreference` and admin notification-settings checks in one shared delivery policy. — implemented in the notification event service.
- Add retry/error logging. — delivery attempts are logged through delivery audit records; production retries remain tied to BullMQ + Redis.

### Phase 5 — WebSocket gateway

- Add authenticated WebSocket server. — implemented with Socket.IO using REST JWT access tokens and active-user checks.
- Add room membership for users and conversations. — implemented for private user rooms, role rooms, and client-requested conversation rooms.
- Emit chat events from message creation/update/delete flows. — message creation emits `message:created` and soft deletion emits `message:deleted` to authorized conversation rooms after database writes commit.
- Emit notification and alert events from worker after durable notification creation. — implemented in the event service abstraction.
- Add unread-count events. — implemented in the event service abstraction.

### Phase 6 — Cleanup and frontend migration

- Update frontend API client imports to align with **Messages**, **Notifications**, and **Communications** sections.
- Remove deprecated docs aliases only after frontend confirms migration.
- Add end-to-end tests for message delivery, notification preferences, email jobs, and WebSocket events.

## Endpoint Ownership After Refactor

### Messages

- `GET /admin/messages`
- `POST /admin/messages`
- `DELETE /admin/messages`
- `GET /admin/messages/:id`
- `POST /admin/messages/:id/reply`
- `DELETE /admin/messages/:id`
- `POST /admin/messages/threads`
- `GET /admin/messages/threads`
- `GET /admin/messages/threads/:id/messages`
- `POST /admin/messages/threads/:id/messages`
- `GET /staff/messages`
- `GET /staff/messages/:id`
- `POST /staff/messages/:id/reply`
- `DELETE /staff/messages/:id`
- `POST /staff/messages/threads`
- `GET /staff/messages/threads`
- `GET /staff/messages/threads/:id/messages`
- `POST /staff/messages/threads/:id/messages`

### Admin — Communications

- `GET /admin/announcements`
- `POST /admin/announcements`
- `DELETE /admin/announcements/:id`

### Staff — Communications

- `GET /staff/announcements`
- `PATCH /staff/announcements/:id/read`
- `POST /staff/announcements/:id/acknowledge`

### Notifications

- `GET /admin/notifications/history`
- `DELETE /admin/notifications/:id`
- `GET /admin/notifications/preferences`
- `PATCH /admin/notifications/preferences`
- `GET /staff/notifications`
- `PATCH /staff/notifications/:id/read`
- `GET /staff/notifications/preferences`
- `PATCH /staff/notifications/preferences`

Recommended additions:

- `PATCH /admin/notifications/:id/read` — implemented
- `PATCH /admin/notifications/read-all` — implemented
- `GET /admin/notifications/unread-count` — implemented
- `DELETE /staff/notifications/:id` — implemented
- `PATCH /staff/notifications/read-all` — implemented
- `GET /staff/notifications/unread-count` — implemented

### Admin — Dashboard

Keep for UI compatibility, backed by notifications:

- `GET /admin/dashboard/alerts`
- `PATCH /admin/dashboard/alerts/:id/read`
- `PATCH /admin/dashboard/alerts/read-all`

## Approved Implementation Decisions

1. Keep existing role-scoped URLs stable in this API version. The refactor changes module ownership and OpenAPI grouping, not public paths. A future breaking API version can introduce neutral `/messages/*` and `/notifications/*` paths if intentionally versioned.
2. Normalize regular admin event notification settings to `{ email, dashboard }` like super-admin settings, with legacy booleans interpreted as both channels using the same value.
3. Keep staff notification preferences at the broad category level for now: `message`, `announcement`, `visit`, and `system`. Do not add staff event-level controls until product explicitly requests them.
4. Use REST-only durable chat writes initially. WebSocket support should deliver post-commit events, read state, typing indicators, and live notification/alert updates.
5. Use BullMQ + Redis in production for notification fan-out, email delivery, retries, and delayed/missed-event scheduling.
6. Add delivery audit records with the worker implementation. Track recipient, channel, status, skip/failure reason, attempt count, and timestamps; allow `notificationId` to be nullable for email-only events.
7. Keep admin dashboard alerts as a filtered projection of actionable/operational notifications only, such as visit, booking, report, system, missed check-in/out, and high-priority message events when needed. Do not include every notification by default.
8. Use soft deletion for user-facing message and notification deletion. Retain messages by default until an explicit administrative retention policy is approved. Allow scheduled cleanup of old read notifications and delivery audit records after a defined support/debugging window, such as 90–180 days for delivery audit records and 180 days for read notifications.
9. Do not change announcement behavior in this implementation. Announcements remain in the communications module with existing routes and delivery behavior.

## Implementation Progress

### Completed in initial implementation

- Added dedicated admin and staff message routers while keeping the existing `/admin/messages/*` and `/staff/messages/*` URLs stable. These routers now use Messages controllers and a Messages service facade to establish Messages module ownership while preserving existing behavior.
- Added dedicated admin and staff notification routers while keeping the existing `/admin/notifications/*` and `/staff/notifications/*` URLs stable. These routers now use Notifications controllers and a Notifications service facade to establish Notifications module ownership while preserving existing behavior.
- Implemented the recommended notification utility endpoints: admin notification read, admin read-all, admin unread count, staff notification delete, staff read-all, and staff unread count.
- Removed message and notification route declarations from the admin/staff communications routers so those routers now own announcement endpoints only.
- Mounted the new message and notification routers from the admin and staff role routers before the remaining communications announcement routers.
- Updated OpenAPI tagging so message/chat endpoints are documented under **Messages**, notification endpoints are documented under **Notifications**, and communications tags describe announcement workflows only.
- Added Swagger/OpenAPI documentation for the Socket.IO realtime connection contract and post-commit message/notification event behavior.
- Fixed admin dashboard alert route ordering so `/admin/dashboard/alerts/read-all` is registered before `/admin/dashboard/alerts/:id/read`.

### Still pending

- Move the remaining message implementation details out of the legacy communications service and into the Messages service internals.
- Move the remaining notification implementation details out of the legacy communications service and into the Notifications service internals.
- Added notification event abstraction, delivery policy checks, delivery audit model, generic notification email sender, worker entrypoint, and realtime gateway abstraction.
- BullMQ + Redis and Socket.IO transport are now wired in. `REDIS_URL` enables durable queue processing; without it, the in-process fallback remains available for local/test runs.
- Socket.IO room joins now enforce the same conversation authorization rule as REST message reads.
- Move event producers incrementally from direct `notification.create` calls onto `enqueueNotificationEvent(...)`; message creation, announcement creation, visit assignment, visit reassignment, and visit cancellation now use the notification event queue.

## Suggested Acceptance Criteria for Future Implementation

- Message/chat routes are owned by the **Messages** module and documented only in the **Messages** section.
- Admin/staff communications modules no longer declare message/chat endpoints.
- Notification routes are owned by the **Notifications** module and documented only in the **Notifications** section.
- Announcement endpoints remain in communications sections.
- Dashboard alerts continue to work and read from the same notification state as notification history.
- Notification delivery respects both broad `NotificationPreference` settings and applicable admin event-specific settings.
- Email sending happens asynchronously through a worker.
- WebSocket events are emitted only after durable database writes.
- Staff alert behavior remains unchanged unless explicitly approved.

## Completion Cross-Check — August 8, 2026

The implementation has been cross-checked against this plan. The public route surface described in **Endpoint Ownership After Refactor** is present and mounted under the existing role-scoped URL prefixes, while module ownership has been split into Messages, Communications, and Notifications.

### Confirmed complete

- **Messages endpoints:** admin and staff message/chat endpoints are declared in the dedicated Messages routers and are mounted from the admin/staff role routers before the announcement-only communications routers.
- **Communications endpoints:** admin and staff communications routers now contain announcement endpoints only.
- **Notifications endpoints:** admin and staff notification history/feed, preferences, read, read-all, unread-count, and delete endpoints are declared in the dedicated Notifications routers.
- **Dashboard alerts:** admin dashboard alert routes remain available and operate over the notification rows/read state used by notification history.
- **Notification event abstraction:** message creation, announcement creation, and visit assignment/reassignment/cancellation paths enqueue notification events instead of directly creating notification feed rows in those request flows.
- **Worker and email delivery:** the notification event service supports BullMQ + Redis when `REDIS_URL` is configured, keeps an in-process fallback for local/test environments, applies user/admin preferences, sends generic notification emails, emits realtime events, and records delivery audit rows.
- **WebSocket gateway:** Socket.IO is attached to the HTTP server, authenticates with REST JWT access tokens, joins private user/role rooms, authorizes conversation room joins, and emits post-commit message/notification/alert events.
- **Database migration coverage:** the `NotificationDelivery` audit model in `prisma/schema.prisma` is now backed by a migration that creates its enums, table, indexes, and foreign keys.

### Implementation notes

- The public URL paths intentionally remain `/admin/messages/*`, `/staff/messages/*`, `/admin/notifications/*`, and `/staff/notifications/*` to avoid a frontend breaking change.
- Some internal service methods still delegate through the legacy communications service facade. This does not block the documented endpoints, worker behavior, or realtime delivery, but can be cleaned up later as an internal-only refactor.
- `REDIS_URL` is optional for local endpoint testing. In production it should be configured so notification jobs are durable and retryable through BullMQ.

## Endpoint Testing Guide

### 1. Required local setup

Install dependencies, provide environment variables, run migrations, seed users, and start the API:

```bash
npm install

cat > .env <<'ENV'
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/dailyassist"
JWT_ACCESS_SECRET="replace-with-at-least-32-characters-access-secret"
JWT_REFRESH_SECRET="replace-with-at-least-32-characters-refresh-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
# Optional locally, recommended/required for production-grade notification queueing:
# REDIS_URL="redis://localhost:6379"
# Email delivery is optional in local development and required by default in production.
# Set EMAIL_DELIVERY_REQUIRED=true locally if you want startup to fail until SMTP is configured.
EMAIL_DELIVERY_REQUIRED=false
# Without SMTP/Mailtrap credentials, email content is logged in dev instead of sent:
# MAILTRAP_PASS="your-mailtrap-token"
# EMAIL_HOST="smtp.example.com"
# EMAIL_PORT=587
# EMAIL_USER="smtp-user"
# EMAIL_PASS="smtp-password"
# EMAIL_FROM="DailyAssist <hello@dailyassistuk.com>"
ENV

npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev
```

In a second terminal, start the worker when testing BullMQ/Redis delivery:

```bash
REDIS_URL="redis://localhost:6379" npm run worker:notifications
```

If `REDIS_URL` is not set, REST-triggered notification events are processed by the API process through the local in-process fallback queue. If `EMAIL_DELIVERY_REQUIRED=true`, the API verifies SMTP during startup and fails fast when Mailtrap/generic SMTP credentials are missing or invalid.

### 2. Get admin and staff tokens

The seed script defaults to `admin@dailyassist.local` and `staff@dailyassist.local` unless overridden with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_STAFF_EMAIL`, or `SEED_STAFF_PASSWORD`.

```bash
BASE_URL="http://localhost:4000/api/v1"

ADMIN_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@dailyassist.local","password":"Admin@12345"}' | jq -r '.data.accessToken')

STAFF_TOKEN=$(curl -sS -X POST "$BASE_URL/auth/staff/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"staff@dailyassist.local","password":"Staff@12345"}' | jq -r '.data.accessToken')
```

### 3. Smoke-test the documented read endpoints

A script is included for the main communications/notifications read checks:

```bash
BASE_URL="http://localhost:4000/api/v1" \
ADMIN_EMAIL="admin@dailyassist.local" \
ADMIN_PASSWORD="Admin@12345" \
STAFF_EMAIL="staff@dailyassist.local" \
STAFF_PASSWORD="Staff@12345" \
./scripts/smoke/phase5-communications-curl.sh
```

The script checks:

1. `GET /admin/messages/threads`
2. `GET /admin/announcements`
3. `GET /admin/notifications/history`
4. `GET /staff/messages/threads`
5. `GET /staff/announcements`
6. `GET /staff/notifications`

### 4. Manual endpoint checks

Use the tokens from step 2.

```bash
curl -sS "$BASE_URL/admin/messages?page=1&pageSize=10" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
curl -sS "$BASE_URL/admin/messages/threads?page=1&limit=10" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
curl -sS "$BASE_URL/admin/announcements?page=1&limit=10" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
curl -sS "$BASE_URL/admin/notifications/history?page=1&limit=10" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
curl -sS "$BASE_URL/admin/notifications/unread-count" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
curl -sS "$BASE_URL/admin/notifications/preferences" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
curl -sS "$BASE_URL/admin/dashboard/alerts" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

curl -sS "$BASE_URL/staff/messages?page=1&pageSize=10" -H "Authorization: Bearer $STAFF_TOKEN" | jq .
curl -sS "$BASE_URL/staff/messages/threads?page=1&limit=10" -H "Authorization: Bearer $STAFF_TOKEN" | jq .
curl -sS "$BASE_URL/staff/announcements?page=1&limit=10" -H "Authorization: Bearer $STAFF_TOKEN" | jq .
curl -sS "$BASE_URL/staff/notifications?page=1&limit=10" -H "Authorization: Bearer $STAFF_TOKEN" | jq .
curl -sS "$BASE_URL/staff/notifications/unread-count" -H "Authorization: Bearer $STAFF_TOKEN" | jq .
curl -sS "$BASE_URL/staff/notifications/preferences" -H "Authorization: Bearer $STAFF_TOKEN" | jq .
```

### 5. Create data that triggers notification delivery

Create an announcement, which should enqueue an `announcement.created` notification event for eligible staff recipients:

```bash
curl -sS -X POST "$BASE_URL/admin/announcements" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test announcement","body":"Testing notification delivery","audienceType":"ALL_STAFF"}' | jq .

curl -sS "$BASE_URL/staff/notifications?page=1&limit=10" \
  -H "Authorization: Bearer $STAFF_TOKEN" | jq .
```

After you identify a notification ID, test read/delete operations:

```bash
NOTIFICATION_ID="paste-notification-id-here"

curl -sS -X PATCH "$BASE_URL/staff/notifications/$NOTIFICATION_ID/read" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{}' | jq .

curl -sS -X DELETE "$BASE_URL/staff/notifications/$NOTIFICATION_ID" \
  -H "Authorization: Bearer $STAFF_TOKEN" | jq .
```

### 6. Test preferences

Disable staff announcement notifications, create another announcement, and confirm it is skipped for that staff member:

```bash
curl -sS -X PATCH "$BASE_URL/staff/notifications/preferences" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"announcementEnabled":false}' | jq .
```

For admin event-level notification settings, use:

```bash
curl -sS "$BASE_URL/admin/notification-settings" -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

curl -sS -X PATCH "$BASE_URL/admin/notification-settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"bookingRequest":{"email":true,"dashboard":true}}' | jq .
```

### 7. Test Socket.IO realtime behavior

Connect a Socket.IO client to `http://localhost:4000` using the same JWT access token, not the `/api/v1` prefix. Provide the token as `auth.token` or an `Authorization: Bearer <token>` header. Then listen for:

- `message:created`
- `message:deleted`
- `notification:created`
- `notification:read`
- `notification:deleted`
- `notification:unread_count`
- `alert:created`
- `alert:read`
- `alert:unread_count`

To receive chat room events, emit `conversation:join` with a conversation ID that the authenticated user is allowed to access.

### 8. Production environment checklist

Production should provide:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` with at least 32 characters each
- `CORS_ORIGIN` set to the deployed frontend origin or comma-separated origins
- `FRONTEND_URL`
- `REDIS_URL` for BullMQ notification queue durability and retries
- `EMAIL_DELIVERY_REQUIRED` (defaults to `true` in production) so production fails fast if SMTP is missing
- SMTP/Mailtrap configuration for real email delivery: either `MAILTRAP_PASS` with the Mailtrap defaults or the complete generic SMTP set `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM`

Run production migrations before deploying the new worker/API version:

```bash
npm run prisma:migrate:deploy
npm run build
npm start
npm run worker:notifications
```
