#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000/api/v1}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@dailyassist.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@12345}"

if ! command -v http >/dev/null 2>&1; then
  echo "httpie is required (command: http)." >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

LOGIN_RESPONSE=$(http --ignore-stdin POST "$BASE_URL/auth/admin/login" email="$ADMIN_EMAIL" password="$ADMIN_PASSWORD")
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')

if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  echo "Login failed:" >&2
  echo "$LOGIN_RESPONSE" | jq . >&2
  exit 1
fi

auth="Authorization:Bearer $ACCESS_TOKEN"

http --ignore-stdin GET "$BASE_URL/admin/dashboard/summary" "$auth"
http --ignore-stdin GET "$BASE_URL/admin/bookings?page==1&limit==5&sortBy==createdAt&sortOrder==desc" "$auth"
http --ignore-stdin GET "$BASE_URL/admin/clients?page==1&limit==5&sortBy==createdAt&sortOrder==desc" "$auth"
http --ignore-stdin GET "$BASE_URL/admin/staff?page==1&limit==5&sortBy==createdAt&sortOrder==desc" "$auth"
http --ignore-stdin GET "$BASE_URL/admin/recruitment/applications?page==1&limit==5&sortBy==createdAt&sortOrder==desc" "$auth"

echo "Smoke pass complete."
