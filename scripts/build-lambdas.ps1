# Package les Lambdas Python (ingestion + query) — Windows PowerShell
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$Dist = Join-Path $Root "dist\lambdas"

if (Test-Path $Dist) { Remove-Item -Recurse -Force $Dist }
New-Item -ItemType Directory -Force -Path (Join-Path $Dist "ingestion") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Dist "query") | Out-Null

Write-Host "==> Installation dépendances backend"
pip install -r (Join-Path $Backend "requirements.txt") -t (Join-Path $Dist "ingestion") -q
pip install -r (Join-Path $Backend "requirements.txt") -t (Join-Path $Dist "query") -q

Write-Host "==> Copie code shared + handlers"
Copy-Item -Recurse (Join-Path $Backend "shared") (Join-Path $Dist "ingestion\shared")
Copy-Item -Recurse (Join-Path $Backend "shared") (Join-Path $Dist "query\shared")
Copy-Item -Recurse (Join-Path $Backend "ingestion_handler") (Join-Path $Dist "ingestion\ingestion_handler")
Copy-Item -Recurse (Join-Path $Backend "query_handler") (Join-Path $Dist "query\query_handler")

Write-Host "==> Création des ZIP"
$IngestionZip = Join-Path $Dist "ingestion-handler.zip"
$QueryZip = Join-Path $Dist "query-handler.zip"
if (Test-Path $IngestionZip) { Remove-Item $IngestionZip }
if (Test-Path $QueryZip) { Remove-Item $QueryZip }
Compress-Archive -Path (Join-Path $Dist "ingestion\*") -DestinationPath $IngestionZip
Compress-Archive -Path (Join-Path $Dist "query\*") -DestinationPath $QueryZip

Write-Host "OK: $IngestionZip"
Write-Host "OK: $QueryZip"
