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

- `GET /admin/notifications/unread-count`
- `PATCH /admin/notifications/:id/read`
- `PATCH /admin/notifications/read-all`

#### Staff notification endpoints

Keep existing URLs and tag under **Notifications**:

- `GET /staff/notifications`
- `PATCH /staff/notifications/:id/read`
- `GET /staff/notifications/preferences`
- `PATCH /staff/notifications/preferences`

Recommended additions:

- `DELETE /staff/notifications/:id`
- `GET /staff/notifications/unread-count`
- `PATCH /staff/notifications/read-all`

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

- Add queue infrastructure.
- Add notification worker process entry point.
- Add email templates per event category.
- Enforce `NotificationPreference` and admin notification-settings checks in one shared delivery policy.
- Add retry/error logging.

### Phase 5 — WebSocket gateway

- Add authenticated WebSocket server.
- Add room membership for users and conversations.
- Emit chat events from message creation/update/delete flows.
- Emit notification and alert events from worker after durable notification creation.
- Add unread-count events.

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

- `PATCH /admin/notifications/:id/read`
- `PATCH /admin/notifications/read-all`
- `GET /admin/notifications/unread-count`
- `DELETE /staff/notifications/:id`
- `PATCH /staff/notifications/read-all`
- `GET /staff/notifications/unread-count`

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

- Added dedicated admin and staff message routers while keeping the existing `/admin/messages/*` and `/staff/messages/*` URLs stable. These routers currently delegate to the existing communications controllers/services to keep behavior unchanged while establishing Messages module ownership.
- Added dedicated admin and staff notification routers while keeping the existing `/admin/notifications/*` and `/staff/notifications/*` URLs stable. These routers currently delegate to the existing communications controllers/services to keep behavior unchanged while establishing Notifications module ownership.
- Removed message and notification route declarations from the admin/staff communications routers so those routers now own announcement endpoints only.
- Mounted the new message and notification routers from the admin and staff role routers before the remaining communications announcement routers.

### Still pending

- Extract message controller/service logic from the communications service into focused messages services.
- Extract notification controller/service logic from the communications service into focused notifications services.
- Add notification event abstraction, BullMQ + Redis worker, delivery audit records, email templates, and WebSocket gateway in later phases.

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
