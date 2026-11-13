param(
  [Parameter(Mandatory = $true)][string]$File,
  [string]$Database = "postgres"
)

# Local-only gate helper. Refuses non-loopback hosts.
$HostPort = "127.0.0.1:54329"
if ($HostPort -notmatch '^127\.0\.0\.1:') {
  throw "Refusing non-local database host"
}

$container = "amem-wa-gate-pg"
$probe = docker port $container 2>&1 | Out-String
if ($probe -notmatch '127\.0\.0\.1:54329') {
  throw "Container port binding is not 127.0.0.1:54329 — aborting"
}

Get-Content -Raw -Encoding UTF8 $File | docker exec -i $container psql -U postgres -d $Database -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) {
  throw "psql failed for $File (exit $LASTEXITCODE)"
}
