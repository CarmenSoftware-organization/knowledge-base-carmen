# Apply SQL migrations to the EXTERNAL Postgres configured in backend/.env.docker.
#
# The local `db` container was removed and docker-compose now lives in backend/.
# Migrations run against DB_* (from backend/.env.docker) via a one-off pgvector
# container, so host.docker.internal resolves the same way the backend container
# sees it (and a remote DB host works too).
#
# Usage (from anywhere): .\scripts\migrate-docker.ps1 [migration.sql ...]
#   No args   -> applies backend/migrations/0001_init_schema.sql
#   With args -> applies the given files in order
param([string[]]$Files)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root "backend/.env.docker"
$MigDir  = Join-Path $Root "backend/migrations"

if (-not (Test-Path $EnvFile)) {
    Write-Error "Missing backend/.env.docker — copy from backend/docker-compose.env.example first."
}

# Load DB_* from backend/.env.docker (KEY=VALUE lines; ignore comments/blanks).
$cfg = @{}
foreach ($line in Get-Content -Path $EnvFile -Encoding UTF8) {
    $t = $line.Trim()
    if ($t -eq "" -or $t.StartsWith("#")) { continue }
    $idx = $t.IndexOf("=")
    if ($idx -lt 1) { continue }
    $cfg[$t.Substring(0, $idx).Trim()] = $t.Substring($idx + 1).Trim()
}

function Get-Cfg($key, $default) {
    if ($cfg.ContainsKey($key) -and $cfg[$key]) { $cfg[$key] } else { $default }
}

$DbHost    = Get-Cfg "DB_HOST"     "host.docker.internal"
$DbPort    = Get-Cfg "DB_PORT"     "5432"
$DbUser    = Get-Cfg "DB_USER"     "postgres"
$DbName    = Get-Cfg "DB_NAME"     "carmen_db"
$DbPass    = Get-Cfg "DB_PASSWORD" "postgres"
$DbSslMode = Get-Cfg "DB_SSLMODE"  "disable"

# Migration files in order. Override by passing paths as arguments.
if (-not $Files -or $Files.Count -eq 0) {
    $Files = @((Join-Path $MigDir "0001_init_schema.sql"))
}

foreach ($f in $Files) {
    if ([System.IO.Path]::IsPathRooted($f)) {
        $path = $f
    } elseif (Test-Path (Join-Path (Get-Location) $f)) {
        $path = Join-Path (Get-Location) $f
    } else {
        $path = Join-Path $Root $f
    }
    Write-Host "==> $f"
    Get-Content -Path $path -Raw -Encoding UTF8 | docker run --rm -i `
        --add-host=host.docker.internal:host-gateway `
        -e PGPASSWORD=$DbPass -e PGSSLMODE=$DbSslMode `
        pgvector/pgvector:pg16 `
        psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ""
Write-Host "Schema applied to $DbUser@${DbHost}:$DbPort/$DbName (sslmode=$DbSslMode)."
Write-Host "New BUs are provisioned at runtime via create_bu_tables(<slug>); see backend/migrations/README.md."
