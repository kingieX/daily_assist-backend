#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000/api/v1}"
CAPTCHA_TOKEN="${CAPTCHA_TOKEN:-}"

FULL_NAME="${FULL_NAME:-Jane Doe}"
EMAIL="${EMAIL:-jane.doe@example.com}"
PHONE_NUMBER="${PHONE_NUMBER:-+1 555 000 1234}"
SUBJECT="${SUBJECT:-Help needed for elderly parent}"
MESSAGE="${MESSAGE:-Please contact me about available home assistance services.}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

headers=(-H 'Content-Type: application/json')
if [[ -n "$CAPTCHA_TOKEN" ]]; then
  headers+=(-H "x-captcha-token: $CAPTCHA_TOKEN")
fi

payload=$(jq -n \
  --arg fullName "$FULL_NAME" \
  --arg email "$EMAIL" \
  --arg phoneNumber "$PHONE_NUMBER" \
  --arg subject "$SUBJECT" \
  --arg message "$MESSAGE" \
  '{
    fullName: $fullName,
    email: $email,
    phoneNumber: $phoneNumber,
    subject: $subject,
    message: $message
  }')

curl -sS -X POST "$BASE_URL/public/bookings" \
  "${headers[@]}" \
  -d "$payload" | jq .

echo
echo "Public booking enquiry smoke request complete."
if [[ -z "$CAPTCHA_TOKEN" ]]; then
  echo "Note: CAPTCHA_TOKEN not provided. This only works when CAPTCHA_SECRET is disabled locally."
fi
