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
    "backend/migrations/0001_init_documents.sql",
    "backend/migrations/0002_setup_multi_bu.sql",
    "backend/migrations/0003_create_activity_logs.sql",
    "backend/migrations/0004_chat_history.sql",
    "backend/migrations/0005_chat_history_privacy.sql",
    "backend/migrations/0007_create_faq.sql"
)

foreach ($rel in $files) {
    $path = Join-Path $Root $rel
    Write-Host "==> $rel"
    Get-Content -Path $path -Raw -Encoding UTF8 | docker compose --env-file .env.docker exec -T db psql -U $pgUser -d $pgDb -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host ""
Write-Host "Core migrations finished (1536-dim path)."
Write-Host "Optional: backend/migrations/0006_vector_2000.sql — see backend/migrations/README.md"
Write-Host "Optional: backend/migrations/0008_clear_faq_carmen.sql"
