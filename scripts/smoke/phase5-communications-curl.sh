#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@dailyassist.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@12345}"
STAFF_EMAIL="${STAFF_EMAIL:-staff@dailyassist.local}"
STAFF_PASSWORD="${STAFF_PASSWORD:-Staff@12345}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

admin_token=$(curl -sS -X POST "$BASE_URL/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.data.accessToken')

staff_token=$(curl -sS -X POST "$BASE_URL/auth/staff/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$STAFF_EMAIL\",\"password\":\"$STAFF_PASSWORD\"}" | jq -r '.data.accessToken')

curl -sS "$BASE_URL/admin/messages/threads?page=1&limit=5" -H "Authorization: Bearer $admin_token" | jq .
curl -sS "$BASE_URL/admin/announcements" -H "Authorization: Bearer $admin_token" | jq .
curl -sS "$BASE_URL/admin/notifications/history?page=1&limit=5" -H "Authorization: Bearer $admin_token" | jq .

curl -sS "$BASE_URL/staff/messages/threads?page=1&limit=5" -H "Authorization: Bearer $staff_token" | jq .
curl -sS "$BASE_URL/staff/announcements" -H "Authorization: Bearer $staff_token" | jq .
curl -sS "$BASE_URL/staff/notifications?page=1&limit=5" -H "Authorization: Bearer $staff_token" | jq .

echo "Phase 5 communications smoke read pass complete."
