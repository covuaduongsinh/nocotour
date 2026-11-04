param(
  [string]$VpsIp = "217.15.160.118",
  [string]$SshUser = "root",
  [string]$SshKey = "C:\Users\duongsinh\.ssh\id_ed25519",
  [string]$SiteUrl = "https://nocoedu.dsc.edu.vn/main",
  [switch]$SkipClientBuild,
  [switch]$SkipServerBuild,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  NocoEdu: Fast Build & 1-Click VPS Deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Build Client and Server
if (-not $SkipBuild) {
  if (-not $SkipClientBuild) {
    Write-Host "[1/6] Building Client with Vite..." -ForegroundColor Yellow
    pnpm exec vite build
    if ($LASTEXITCODE -ne 0) { throw "Client build failed" }
  } else {
    Write-Host "[1/6] Skipping Client build (--SkipClientBuild)" -ForegroundColor DarkGray
  }

  if (-not $SkipServerBuild) {
    Write-Host "[2/6] Building Server with TypeScript & tsc-alias..." -ForegroundColor Yellow
    pnpm exec tsc -p tsconfig.server.json
    if ($LASTEXITCODE -ne 0) { throw "Server tsc failed" }
    pnpm exec tsc-alias -p tsconfig.server.json
    if ($LASTEXITCODE -ne 0) { throw "Server tsc-alias failed" }
  } else {
    Write-Host "[2/6] Skipping Server build (--SkipServerBuild)" -ForegroundColor DarkGray
  }
} else {
  Write-Host "[1-2/6] Skipping all builds (--SkipBuild)" -ForegroundColor DarkGray
}

# 2. Prepare bundle assets
Write-Host "[3/6] Packaging deployment bundle..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "storage/exports" | Out-Null
Copy-Item -Force "package.json" "dist/package.json"

$tarPath = "storage/exports/dist_fast.tar.gz"
if (Test-Path $tarPath) { Remove-Item -Force $tarPath }

tar -czf $tarPath -C dist client server package.json
$tarItem = Get-Item $tarPath
$sizeMb = [math]::Round($tarItem.Length / 1MB, 2)
Write-Host "Bundle created: $tarPath ($sizeMb MB)" -ForegroundColor Green

# 3. Determine target release on VPS
Write-Host "[4/6] Determining next release version on VPS..." -ForegroundColor Yellow
$currentRelease = ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "ls -1 /srv/nocoedu-dsc/releases 2>/dev/null | grep -E '^v[0-9]+$' | sort -V | tail -n 1"
$nextNum = 1
if ($currentRelease -match '^v(\d+)$') {
  $nextNum = [int]$matches[1] + 1
}
$releaseName = "v$nextNum"
Write-Host "Target Release: $releaseName (active was $currentRelease)" -ForegroundColor Green

# 4. Upload bundle
Write-Host "[5/6] Uploading bundle to VPS ($sizeMb MB)..." -ForegroundColor Yellow
ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "mkdir -p /srv/nocoedu-dsc/releases/$releaseName"
scp -i $SshKey -o StrictHostKeyChecking=no $tarPath "${SshUser}@${VpsIp}:/srv/nocoedu-dsc/releases/$releaseName/dist_fast.tar.gz"

# 5. Extract bundle, hardlink node_modules and update release symlink
Write-Host "[6/6] Activating release on VPS & starting container..." -ForegroundColor Yellow
ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "/usr/local/bin/nocoedu-activate-release.sh $releaseName"

# 7. Verify health
Write-Host "Verifying service health ($SiteUrl)..." -ForegroundColor Yellow
$healthy = $false
for ($i = 1; $i -le 15; $i++) {
  Start-Sleep -Seconds 3
  $code = (curl.exe -s -o /dev/null -w "%{http_code}" $SiteUrl)
  if ($code -eq "200") {
    $healthy = $true
    break
  }
  Write-Host "Waiting for service to become ready... (attempt $i/15, code: $code)" -ForegroundColor DarkGray
}

if ($healthy) {
  Write-Host "==========================================" -ForegroundColor Green
  Write-Host "  DEPLOYMENT SUCCESSFUL! (HTTP 200)       " -ForegroundColor Green
  Write-Host "  Active Release : $releaseName           " -ForegroundColor Green
  Write-Host "  Live URL       : $SiteUrl               " -ForegroundColor Cyan
  Write-Host "==========================================" -ForegroundColor Green
} else {
  Write-Host "Warning: Service not returning 200 after restart. Checking container logs..." -ForegroundColor Red
  ssh -i $SshKey -o StrictHostKeyChecking=no "$SshUser@$VpsIp" "docker logs --tail 25 nocoedu-dsc-app"
}
