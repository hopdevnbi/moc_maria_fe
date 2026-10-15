param(
  [string]$EventBaseUrl = 'https://event.mocmaria.com',
  [string]$SiteBaseUrl = 'https://mocmaria.com',
  [string]$ApiBaseUrl = 'https://api.mocmaria.com/api/v1'
)
# Read-only P17 smoke: GET and OPTIONS only; no credentials, mutations or production DB changes.
$ErrorActionPreference = 'Stop'
$failures = New-Object System.Collections.Generic.List[string]
function Check-Get([string]$Name,[string]$Url,[string]$Expected) {
  try {
    $res=Invoke-WebRequest -Uri $Url -UseBasicParsing -Method Get -TimeoutSec 25
    if($res.StatusCode -ne 200){throw "HTTP status not OK"}
    if($Expected -and -not ($res.Content -match [regex]::Escape($Expected))){throw "Expected marker is missing"}
    Write-Output "PASS GET $Name"
  } catch {
    $failures.Add("GET ${Name}: $($_.Exception.Message)")
    Write-Output "FAIL GET $Name"
  }
}
$EventBaseUrl=$EventBaseUrl.TrimEnd('/')
$SiteBaseUrl=$SiteBaseUrl.TrimEnd('/')
$ApiBaseUrl=$ApiBaseUrl.TrimEnd('/')
Check-Get 'Event host root' "$EventBaseUrl/" 'gift-boxes'
Check-Get 'Event landing path' "$EventBaseUrl/event" 'gift-boxes'
Check-Get 'Event release' "$EventBaseUrl/api/release" ''
Check-Get 'Main homepage' "$SiteBaseUrl/" ''
Check-Get 'Public Event API' "$ApiBaseUrl/gift-events/current" ''
try {
  $origin=([uri]$EventBaseUrl).GetLeftPart([System.UriPartial]::Authority)
  $headers=@{Origin=$origin;'Access-Control-Request-Method'='GET';'Access-Control-Request-Headers'='authorization,content-type'}
  $res=Invoke-WebRequest -Uri "$ApiBaseUrl/gift-events/me" -UseBasicParsing -Method Options -TimeoutSec 25 -Headers $headers
  if($res.Headers['Access-Control-Allow-Origin'] -ne $origin -or $res.Headers['Access-Control-Allow-Credentials'] -ne 'true'){
    throw 'Credentialed CORS origin is not confirmed'
  }
  Write-Output 'PASS credentialed CORS preflight'
} catch {
  $failures.Add("CORS: $($_.Exception.Message)")
  Write-Output 'FAIL credentialed CORS preflight'
}
if($failures.Count -gt 0){
  Write-Output 'RELEASE GATE: NOT READY'
  $failures | ForEach-Object { Write-Output $_ }
  exit 1
}
Write-Output 'Read-only HTTP smoke PASS; browser, migrations, P10 and legal sign-off are separate.'
