#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@dailyassist.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@12345}"
STAFF_EMAIL="${STAFF_EMAIL:-staff@dailyassist.local}"
STAFF_PASSWORD="${STAFF_PASSWORD:-Staff@12345}"
BOOKING_ID="${BOOKING_ID:-}"
STAFF_ID="${STAFF_ID:-}"

if [[ -z "$BOOKING_ID" || -z "$STAFF_ID" ]]; then
  echo "BOOKING_ID and STAFF_ID are required." >&2
  exit 1
fi
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

start_at=$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+2H +%Y-%m-%dT%H:%M:%SZ)
end_at=$(date -u -d '+3 hours' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+3H +%Y-%m-%dT%H:%M:%SZ)

visit_response=$(curl -sS -X POST "$BASE_URL/admin/visits" \
  -H "Authorization: Bearer $admin_token" \
  -H 'Content-Type: application/json' \
  -d "{\"bookingId\":\"$BOOKING_ID\",\"staffId\":\"$STAFF_ID\",\"scheduledStartAt\":\"$start_at\",\"scheduledEndAt\":\"$end_at\"}")

visit_id=$(echo "$visit_response" | jq -r '.data.id')
if [[ -z "$visit_id" || "$visit_id" == "null" ]]; then
  echo "Failed to create visit" >&2
  echo "$visit_response" | jq . >&2
  exit 1
fi

echo "Visit created: $visit_id"

curl -sS "$BASE_URL/staff/dashboard/summary" -H "Authorization: Bearer $staff_token" | jq .

curl -sS -X POST "$BASE_URL/staff/visits/$visit_id/acknowledge" -H "Authorization: Bearer $staff_token" | jq .
curl -sS -X POST "$BASE_URL/staff/visits/$visit_id/check-in" -H "Authorization: Bearer $staff_token" | jq .
curl -sS -X POST "$BASE_URL/staff/visits/$visit_id/check-out" \
  -H "Authorization: Bearer $staff_token" \
  -H 'Content-Type: application/json' \
  -d '{"completionSummary":"Phase 4 smoke completion","staffNotes":"Completed successfully"}' | jq .

curl -sS "$BASE_URL/admin/visits/$visit_id" -H "Authorization: Bearer $admin_token" | jq .

echo "Phase 4 lifecycle smoke complete."
