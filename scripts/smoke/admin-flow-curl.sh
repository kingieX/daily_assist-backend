#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@dailyassist.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@12345}"

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required. Install jq and rerun." >&2
    exit 1
  fi
}

require_jq

echo "[1/6] Admin login"
LOGIN_RESPONSE=$(curl -sS -X POST "$BASE_URL/auth/admin/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  echo "Login failed:" >&2
  echo "$LOGIN_RESPONSE" | jq . >&2
  exit 1
fi

auth_header=( -H "Authorization: Bearer $ACCESS_TOKEN" )

echo "[2/6] Dashboard summary"
curl -sS "$BASE_URL/admin/dashboard/summary" "${auth_header[@]}" | jq .

echo "[3/6] Bookings list (paginated)"
curl -sS "$BASE_URL/admin/bookings?page=1&limit=5&sortBy=createdAt&sortOrder=desc" "${auth_header[@]}" | jq .

echo "[4/6] Clients list (paginated)"
curl -sS "$BASE_URL/admin/clients?page=1&limit=5&sortBy=createdAt&sortOrder=desc" "${auth_header[@]}" | jq .

echo "[5/6] Staff list (paginated)"
curl -sS "$BASE_URL/admin/staff?page=1&limit=5&sortBy=createdAt&sortOrder=desc" "${auth_header[@]}" | jq .

echo "[6/6] Recruitment applications (paginated)"
curl -sS "$BASE_URL/admin/recruitment/applications?page=1&limit=5&sortBy=createdAt&sortOrder=desc" "${auth_header[@]}" | jq .

echo "Smoke pass complete."
