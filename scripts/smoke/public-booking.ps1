Param(
  [string]$BaseUrl = "http://localhost:4000/api/v1",
  [string]$CaptchaToken = "",
  [string]$FullName = "Jane Doe",
  [string]$Email = "jane.doe@example.com",
  [string]$PhoneNumber = "+1 555 000 1234",
  [string]$Subject = "Help needed for elderly parent",
  [string]$Message = "Please contact me about available home assistance services."
)

$headers = @{
  "Content-Type" = "application/json"
}

if (-not [string]::IsNullOrWhiteSpace($CaptchaToken)) {
  $headers["x-captcha-token"] = $CaptchaToken
}

$body = @{
  fullName = $FullName
  email = $Email
  phoneNumber = $PhoneNumber
  subject = $Subject
  message = $Message
} | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/public/bookings" -Headers $headers -Body $body
  $response | ConvertTo-Json -Depth 10
  Write-Host ""
  Write-Host "Public booking enquiry smoke request complete."

  if ([string]::IsNullOrWhiteSpace($CaptchaToken)) {
    Write-Host "Note: CaptchaToken not provided. This only works when CAPTCHA_SECRET is disabled locally."
  }
} catch {
  Write-Error $_
  exit 1
}
