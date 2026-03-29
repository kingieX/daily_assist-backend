# DailyAssist Backend Documentation (Node.js + Express)
## 0. Implementation Status Snapshot (Updated March 28, 2026)
- ✅ Phase 1 implemented: base server, auth, RBAC, middleware stack
- ✅ Phase 2 implemented: public packages/services, bookings, worker applications
- ✅ Phase 3 implemented: admin dashboard, bookings/client/staff/recruitment operations
- ✅ Phase 4 completed in code: visits lifecycle APIs, transition guards, visit-event logging, and staff dashboard summary aggregation implemented
- 🚧 Phase 5 started: conversations/messages, announcements, and notifications endpoints are now scaffolded in backend and OpenAPI

## 1. Product Summary
DailyAssist is a responsive web platform that connects clients (especially elderly people and families) with domestic assistance workers. The backend must support:
- Public no-login booking requests
- Worker application/recruitment and CV handling
- Admin-created staff accounts and full admin control
- Staff daily task lifecycle: assigned → acknowledged → in-progress (check-in) → completed (check-out)
- Admin modules for bookings, schedules, clients, staff, reports, settings, and communications
- Messaging, announcements, notifications, and audit logs
- Offline payment flow only (no online payment gateway)

## 2. Recommended Backend Stack
- Runtime: Node.js
- Framework: Express.js
- Language: TypeScript (recommended)
- ORM: Prisma
- Database: PostgreSQL (recommended for relational workflows and reporting)
- Auth: JWT (access + refresh token strategy)
- Validation: Zod or Joi
- File Storage: S3-compatible storage (for CVs and attachments)
- Caching/Rate Limit Store (optional): Redis

## 3. Why PostgreSQL Instead of MongoDB
Although PRD mentions MongoDB, the actual product flow is strongly relational:
- clients ↔ bookings ↔ visits ↔ staff
- assignment/reassignment history
- structured admin reporting and filtering
- status transitions and auditability requirements

PostgreSQL gives:
- stronger data integrity via constraints
- cleaner joins for admin dashboard/report modules
- better predictable querying for operational reports

## 4. API Base and Versioning
- Base path: `/api/v1`
- Standard response envelope (recommended):
  - success: `{ success: true, message, data }`
  - failure: `{ success: false, message, errors?, code? }`

## 5. Role Model and Permissions
### 5.1 Public Client (No Login)
Can:
- View services/packages/policies
- Submit booking request
- Submit contact request

Cannot:
- Login to dashboard
- Access any protected resources

### 5.2 Worker/Staff
Can:
- Login with admin-provisioned account
- View assigned visits and daily dashboard
- Acknowledge task
- Check in and check out
- View task history
- View announcements and notifications
- Use staff messaging

### 5.3 Admin
Can:
- Full CRUD/operations on bookings, visits, clients, staff
- Manage recruitment pipeline and convert applicants to staff
- Manage packages, services, job posts
- Manage announcements/notifications/messages
- Access reports and system settings
- View audit logs

## 6. Core Data Model (PostgreSQL)
## 6.1 Identity and Security Tables
### `users`
- `id` UUID PK
- `email` (unique, indexed)
- `password_hash`
- `role` ENUM(`SUPER_ADMIN`, `ADMIN`, `STAFF`)
- `status` ENUM(`ACTIVE`, `INACTIVE`, `SUSPENDED`)
- `last_login_at`
- `created_at`, `updated_at`

### `staff_profiles`
- `id` UUID PK
- `user_id` FK `users.id` (unique)
- `first_name`, `last_name`
- `phone`
- `address`, `city`, `zipcode`
- `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relationship`
- `photo_url`
- `summary`, `skills`
- `created_at`, `updated_at`

### `refresh_tokens`
- `id` UUID PK
- `user_id` FK
- `token_hash`
- `expires_at`
- `revoked_at`
- `created_at`

### `password_reset_tokens`
- `id` UUID PK
- `user_id` FK
- `token_hash`
- `expires_at`
- `used_at`
- `created_at`

## 6.2 Public Intake and Operational Tables
### `clients`
- `id` UUID PK
- `first_name`, `last_name`
- `email`, `phone`
- `address`, `city`, `zipcode`
- `status` ENUM(`ACTIVE`, `INACTIVE`)
- `source` ENUM(`WEB_BOOKING`, `ADMIN_CREATED`)
- `created_at`, `updated_at`

### `packages`
- `id` UUID PK
- `name` (e.g., Basic, Standard, Premium)
- `slug` (unique)
- `description`
- `price_min`, `price_max`
- `is_active`
- `display_order`
- `created_at`, `updated_at`

### `services`
- `id` UUID PK
- `name`
- `slug` (unique)
- `category`
- `description`
- `is_additional` BOOLEAN
- `is_active` BOOLEAN
- `created_at`, `updated_at`

### `package_services`
- `id` UUID PK
- `package_id` FK
- `service_id` FK
- unique composite on (`package_id`, `service_id`)

### `bookings`
- `id` UUID PK
- `client_id` FK
- `package_id` FK nullable
- `selected_plan_snapshot`
- `preferred_date`
- `preferred_time`
- `start_date`
- `special_message`
- `emergency_contact_name`
- `emergency_contact_phone`
- `emergency_contact_relationship`
- `agree_to_terms` BOOLEAN
- `consent_to_dailyassist` BOOLEAN
- `status` ENUM(`REQUESTED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- `assigned_staff_id` FK nullable (`users.id`)
- `assigned_by` FK nullable
- `assigned_at` nullable
- `cancelled_reason` nullable
- `created_at`, `updated_at`

### `booking_services`
- `id` UUID PK
- `booking_id` FK
- `service_id` FK nullable
- `service_name_snapshot`
- `service_type` ENUM(`SELECTED`, `ADDITIONAL`)
- `created_at`

## 6.3 Scheduling and Visit Lifecycle
### `visits`
- `id` UUID PK
- `booking_id` FK
- `staff_id` FK (`users.id`)
- `scheduled_start_at`
- `scheduled_end_at`
- `status` ENUM(`ASSIGNED`, `ACKNOWLEDGED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`)
- `acknowledged_at` nullable
- `check_in_at` nullable
- `check_out_at` nullable
- `admin_notes` nullable
- `staff_notes` nullable
- `completion_summary` nullable
- `created_at`, `updated_at`

### `visit_events`
- immutable visit timeline log
- `id` UUID PK
- `visit_id` FK
- `actor_user_id` FK
- `event_type` (e.g., `ASSIGNED`, `REASSIGNED`, `ACKNOWLEDGED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`)
- `payload_json` JSONB
- `created_at`

## 6.4 Recruitment, Communication, Reporting, Settings
### `worker_applications`
- `id` UUID PK
- `first_name`, `last_name`
- `email`, `phone`
- `cv_file_url`
- `status` ENUM(`PENDING`, `SHORTLISTED`, `INTERVIEWED`, `APPROVED`, `REJECTED`, `CONVERTED_TO_STAFF`)
- `review_notes`
- `reviewed_by` FK nullable
- `created_at`, `updated_at`

### `job_posts`
- `id` UUID PK
- `title`
- `department`
- `employment_type`
- `description`
- `requirements`
- `benefits`
- `is_active`
- `created_by` FK
- `created_at`, `updated_at`

### `conversations`
- `id` UUID PK
- `type` ENUM(`ADMIN_STAFF`, `SYSTEM`)
- `staff_id` FK nullable
- `created_at`, `updated_at`

### `messages`
- `id` UUID PK
- `conversation_id` FK
- `sender_user_id` FK
- `body`
- `attachment_url` nullable
- `deleted_at` nullable (soft delete)
- `created_at`, `updated_at`

### `announcements`
- `id` UUID PK
- `title`
- `body`
- `audience_type` ENUM(`ALL_STAFF`, `SELECTED_STAFF`)
- `created_by` FK
- `created_at`, `updated_at`

### `announcement_recipients`
- `id` UUID PK
- `announcement_id` FK
- `staff_id` FK
- `read_at` nullable

### `notifications`
- `id` UUID PK
- `user_id` FK
- `type`
- `title`
- `body`
- `metadata_json` JSONB
- `read_at` nullable
- `created_at`

### `reports`
- `id` UUID PK
- `visit_id` FK
- `booking_id` FK
- `client_id` FK
- `staff_id` FK
- `status` ENUM(`PENDING`, `PROCESSED`, `FLAGGED`)
- `report_notes`
- `billing_status` ENUM(`NOT_READY`, `READY`, `PROCESSED`)
- `processed_by` FK nullable
- `processed_at` nullable
- `created_at`, `updated_at`

### `audit_logs`
- `id` UUID PK
- `actor_user_id` FK nullable
- `action` (CREATE/UPDATE/DELETE/LOGIN/etc)
- `entity_type`
- `entity_id`
- `old_values` JSONB nullable
- `new_values` JSONB nullable
- `ip_address`
- `user_agent`
- `created_at`

### `settings`
- `id` UUID PK
- `scope` ENUM(`SYSTEM`, `USER`)
- `user_id` FK nullable
- `key`
- `value_json` JSONB
- `created_at`, `updated_at`

## 7. Controllers
- `auth.controller.ts`
- `public.controller.ts`
- `booking.controller.ts`
- `visit.controller.ts`
- `client.controller.ts`
- `staff.controller.ts`
- `recruitment.controller.ts`
- `message.controller.ts`
- `announcement.controller.ts`
- `notification.controller.ts`
- `package.controller.ts`
- `jobPost.controller.ts`
- `report.controller.ts`
- `settings.controller.ts`
- `audit.controller.ts`

Each controller should delegate business logic to service layer classes and keep controllers thin.

## 8. Routes and Endpoints
## 8.1 Public Routes (No Auth)
- `GET /public/packages`
- `GET /public/packages/:slug`
- `GET /public/services`
- `GET /public/job-posts`
- `GET /public/policies/:slug`
- `POST /public/bookings`
- `POST /public/worker-applications`
- `POST /public/contact`

## 8.2 Auth Routes
- `POST /auth/admin/login`
- `POST /auth/staff/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## 8.3 Admin Dashboard
- `GET /admin/dashboard/summary`
- `GET /admin/dashboard/charts`
- `GET /admin/dashboard/alerts`

## 8.4 Admin Bookings
- `GET /admin/bookings`
- `GET /admin/bookings/:id`
- `POST /admin/bookings/:id/assign`
- `POST /admin/bookings/:id/cancel`
- `POST /admin/bookings/:id/complete`
- `PATCH /admin/bookings/:id`

## 8.5 Admin Visits & Schedules
- `GET /admin/visits`
- `GET /admin/visits/:id`
- `POST /admin/visits`
- `PATCH /admin/visits/:id`
- `POST /admin/visits/:id/reassign`
- `POST /admin/visits/:id/cancel`

## 8.6 Admin Clients
- `GET /admin/clients`
- `POST /admin/clients`
- `GET /admin/clients/:id`
- `PATCH /admin/clients/:id`
- `DELETE /admin/clients/:id`

## 8.7 Admin Staff
- `GET /admin/staff`
- `POST /admin/staff`
- `GET /admin/staff/:id`
- `PATCH /admin/staff/:id`
- `DELETE /admin/staff/:id`
- `POST /admin/staff/:id/reset-password`

## 8.8 Admin Recruitment
- `GET /admin/recruitment/applications`
- `GET /admin/recruitment/applications/:id`
- `PATCH /admin/recruitment/applications/:id/status`
- `POST /admin/recruitment/applications/:id/convert-to-staff`

## 8.9 Admin Messages / Announcements / Notifications
- `GET /admin/messages/threads`
- `GET /admin/messages/threads/:id/messages`
- `POST /admin/messages/threads/:id/messages`
- `DELETE /admin/messages/:id`
- `GET /admin/announcements`
- `POST /admin/announcements`
- `DELETE /admin/announcements/:id`
- `GET /admin/notifications/history`
- `DELETE /admin/notifications/:id`

## 8.10 Admin Packages / Job Posts / Reports / Settings
- `GET /admin/packages`
- `POST /admin/packages`
- `PATCH /admin/packages/:id`
- `DELETE /admin/packages/:id`
- `GET /admin/job-posts`
- `POST /admin/job-posts`
- `PATCH /admin/job-posts/:id`
- `DELETE /admin/job-posts/:id`
- `GET /admin/reports`
- `GET /admin/reports/:id`
- `POST /admin/reports/:id/process-billing`
- `GET /admin/reports/export`
- `GET /admin/settings/profile`
- `PATCH /admin/settings/profile`
- `GET /admin/settings/system`
- `PATCH /admin/settings/system`
- `GET /admin/settings/audit-logs`

## 8.11 Staff Routes (Authenticated)
- `GET /staff/me`
- `PATCH /staff/me`
- `GET /staff/dashboard/summary`
- `GET /staff/visits/today`
- `GET /staff/visits/history`
- `GET /staff/visits/:id`
- `POST /staff/visits/:id/acknowledge`
- `POST /staff/visits/:id/check-in`
- `POST /staff/visits/:id/check-out`
- `GET /staff/messages/threads`
- `GET /staff/messages/threads/:id/messages`
- `POST /staff/messages/threads/:id/messages`
- `DELETE /staff/messages/:id`
- `GET /staff/announcements`
- `GET /staff/notifications`
- `PATCH /staff/notifications/:id/read`

## 9. Critical Business Rules
- Clients do not log in.
- Only admins can create staff credentials.
- Duplicate email prevention across users and applications.
- Booking and visit statuses must enforce valid transitions.
- Staff check-in/check-out only on assigned/active visits.
- Reassignment must produce visit event history.
- Important modules should use soft delete where history matters.
- No online payment APIs (offline process only).

## 10. Validation Requirements
- Valid email format
- Required phone field for booking/application
- Non-empty required fields
- Password minimum 8 characters
- Terms and consent required for public booking
- CV type and size validation
- Query parameter validation (pagination/filter/sort) with stable defaults: `page`, `limit`, `sortBy`, `sortOrder`
- Input sanitization on all text fields

## 11. Security Requirements
- Password hashing with bcrypt
- JWT auth (short access tokens + rotating refresh tokens)
- Role-based access control middleware
- 30-minute session timeout policy
- Rate limiting for auth and public forms
- Helmet, CORS restrictions, body size limits
- Centralized error handler and structured logging
- Full audit log trail for admin actions
- Secure file upload handling
- Backups and disaster recovery plan

## 12. Suggested Folder Structure (Express)
`src/`
- `app.ts`
- `server.ts`
- `config/`
- `middlewares/`
- `utils/`
- `modules/auth/`
- `modules/public/`
- `modules/bookings/`
- `modules/visits/`
- `modules/clients/`
- `modules/staff/`
- `modules/recruitment/`
- `modules/messages/`
- `modules/announcements/`
- `modules/notifications/`
- `modules/packages/`
- `modules/job-posts/`
- `modules/reports/`
- `modules/settings/`
- `modules/audit/`

`prisma/`
- `schema.prisma`

## 13. Recommended Build Order
1. Auth + RBAC + base user/staff models
2. Public booking flow + package/service models
3. Admin booking and visit assignment
4. Staff acknowledge/check-in/check-out flows
5. Recruitment and convert-to-staff
6. Messages, announcements, notifications
7. Reports, settings, audit logs
8. Hardening (rate limits, monitoring, backups, tests)

## 14. Environment Variables
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `EMAIL_USER`
- `EMAIL_PASS`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `PORT`
- `NODE_ENV`

## 15. Final Development Direction
Implement as a modular monolith first (single deployable), with strict domain boundaries and state transition guards. This gives fast delivery now and easy split into microservices later if scale demands it.


## 16. Staff Profile Extended Fields
- `users.staff_code` generated operational code (e.g., `DA0010+` for staff, reserved `DA0001-DA0009` for admin).
- `staff_profiles`: `date_of_birth`, `sex`, `zone`, `owns_car`, `photo_url`, `cv_file_url`, `staff_role_label`.
- Dedicated credential provisioning endpoint: `POST /admin/staff/:id/provision-credentials` (reset-link delivery only, no plaintext password response).

## 17. Client Profile Extended Fields
- Added `title`, `age`, `sex`, `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relationship`, `proof_of_address_url`, `notes`.
