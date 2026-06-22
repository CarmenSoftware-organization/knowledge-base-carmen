# Run SQL migrations via psql inside the db container (recommended).
# Usage (from repo root): .\scripts\migrate-docker.ps1
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$EnvFile = Join-Path $Root ".env.docker"
if (-not (Test-Path $EnvFile)) {
    Write-Error "Missing .env.docker — copy from docker-compose.env.example first."
}

$pgUser = (docker compose --env-file .env.docker exec -T db printenv POSTGRES_USER).Trim()
$pgDb = (docker compose --env-file .env.docker exec -T db printenv POSTGRES_DB).Trim()
if (-not $pgUser -or -not $pgDb) {
    Write-Error "Could not read POSTGRES_USER / POSTGRES_DB from db container. Is it running?"
}

$files = @(
    "backend/migrations/0001_init_schema.sql"
)

foreach ($rel in $files) {
    $path = Join-Path $Root $rel
    Write-Host "==> $rel"
    Get-Content -Path $path -Raw -Encoding UTF8 | docker compose --env-file .env.docker exec -T db psql -U $pgUser -d $pgDb -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ""
Write-Host "Schema applied (single file, 2000-dim). New BUs are provisioned at runtime via create_bu_tables(<slug>); see backend/migrations/README.md."
