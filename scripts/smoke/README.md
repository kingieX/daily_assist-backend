# Admin & Phase 4 Smoke Scripts

Quick smoke checks for auth/admin endpoints and the Phase 4 visit lifecycle.

## Prerequisites

1. Backend server running (default base URL: `http://localhost:4000/api/v1`).
2. Seeded users available:
   - admin: `admin@dailyassist.local` / `Admin@12345`
   - staff: `staff@dailyassist.local` / `Staff@12345`
3. Tools:
   - `curl` scripts: `curl` + `jq`
   - `httpie` script: `http` + `jq`

## Script 1 — Admin smoke (Phase 3 + pagination contracts)

### Run (curl)

```bash
BASE_URL=http://localhost:4000/api/v1 \
ADMIN_EMAIL=admin@dailyassist.local \
ADMIN_PASSWORD='Admin@12345' \
./scripts/smoke/admin-flow-curl.sh
```

### Run (httpie)

```bash
BASE_URL=http://localhost:4000/api/v1 \
ADMIN_EMAIL=admin@dailyassist.local \
ADMIN_PASSWORD='Admin@12345' \
./scripts/smoke/admin-flow-httpie.sh
```

Checks:
1. `POST /auth/admin/login`
2. `GET /admin/dashboard/summary`
3. `GET /admin/bookings?page&limit&sortBy&sortOrder`
4. `GET /admin/clients?page&limit&sortBy&sortOrder`
5. `GET /admin/staff?page&limit&sortBy&sortOrder`
6. `GET /admin/recruitment/applications?page&limit&sortBy&sortOrder`

## Script 2 — Phase 4 lifecycle smoke (admin + staff)

Requires existing IDs:
- `BOOKING_ID` (from a booking in your DB)
- `STAFF_ID` (the staff user ID to assign)

```bash
BASE_URL=http://localhost:4000/api/v1 \
ADMIN_EMAIL=admin@dailyassist.local \
ADMIN_PASSWORD='Admin@12345' \
STAFF_EMAIL=staff@dailyassist.local \
STAFF_PASSWORD='Staff@12345' \
BOOKING_ID='<booking-uuid>' \
STAFF_ID='<staff-user-uuid>' \
./scripts/smoke/phase4-visit-lifecycle-curl.sh
```

Checks:
1. `POST /admin/visits`
2. `GET /staff/dashboard/summary`
3. `POST /staff/visits/:id/acknowledge`
4. `POST /staff/visits/:id/check-in`
5. `POST /staff/visits/:id/check-out`
6. `GET /admin/visits/:id` (verify event timeline)
