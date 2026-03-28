# Admin Smoke Scripts

Quick smoke checks for auth + admin read operations.

## Prerequisites

1. Backend server running (default base URL: `http://localhost:4000/api/v1`).
2. Seeded admin account available (default: `admin@dailyassist.local` / `Admin@12345`).
3. Tools:
   - `curl` script: `curl` + `jq`
   - `httpie` script: `http` + `jq`

## Run (curl)

```bash
BASE_URL=http://localhost:4000/api/v1 \
ADMIN_EMAIL=admin@dailyassist.local \
ADMIN_PASSWORD='Admin@12345' \
./scripts/smoke/admin-flow-curl.sh
```

## Run (httpie)

```bash
BASE_URL=http://localhost:4000/api/v1 \
ADMIN_EMAIL=admin@dailyassist.local \
ADMIN_PASSWORD='Admin@12345' \
./scripts/smoke/admin-flow-httpie.sh
```

## What it checks

1. `POST /auth/admin/login`
2. `GET /admin/dashboard/summary`
3. `GET /admin/bookings?page&limit&sortBy&sortOrder`
4. `GET /admin/clients?page&limit&sortBy&sortOrder`
5. `GET /admin/staff?page&limit&sortBy&sortOrder`
6. `GET /admin/recruitment/applications?page&limit&sortBy&sortOrder`
