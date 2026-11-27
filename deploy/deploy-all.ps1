<#
  BCS BANK BY OKZ - ONE-CLICK "DEPLOY EVERYTHING"
  Double-click "BCS Bank by OKZ - Deploy.bat". It:
    1. Checks every tool it needs (Node, npm, Git, GitHub CLI, Java/Android SDK)
    2. Pulls any newer code from GitHub first (no "push rejected" surprises)
    3. Installs/updates npm packages only when needed
    4. Type-checks BEFORE touching the version number (a broken build never ships)
    5. Bumps version, builds website + signed APK, pushes, publishes the APK release
       (Vercel + GitHub Pages redeploy automatically from the push)
    6. Waits until the live site really shows the new version, then opens it
  If the Android tools are missing it still ships the website and tells you.
#>
param([string]$Message = "", [switch]$WebOnly)

$ErrorActionPreference = 'Continue'
$Repo    = 'Six-Planets/bcs-bank-by-okz'
$LiveUrl = 'https://bcs-bank-by-okz.vercel.app'
$ApkName = 'BCS-Bank-by-OKZ.apk'
$Root    = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Step($t) { Write-Host "`n==> $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "    [OK] $t" -ForegroundColor Green }
function Warn($t) { Write-Host "    [WARN] $t" -ForegroundColor Yellow }
function Fail($t) { Write-Host "`n[FAILED] $t" -ForegroundColor Red; Write-Host "Nothing broken was published. Fix the message above and double-click again." -ForegroundColor Yellow; exit 1 }
function Has($c)  { [bool](Get-Command $c -ErrorAction SilentlyContinue) }

$sw = [Diagnostics.Stopwatch]::StartNew()

# ---------------------------------------------------------------- 1. Preflight
Step "Checking tools"
if (-not (Has node)) { Fail "Node.js is not installed. Install the LTS version from https://nodejs.org then try again." }
if (-not (Has npm))  { Fail "npm is missing (it comes with Node.js). Reinstall Node.js LTS." }
if (-not (Has git))  { Fail "Git is not installed. Install it from https://git-scm.com then try again." }
Ok "Node $(node -v), Git $((git --version) -replace 'git version ','')"

$canRelease = Has gh
if ($canRelease) {
  gh auth status --hostname github.com *> $null
  if ($LASTEXITCODE -ne 0) {
    Warn "GitHub CLI is not signed in - opening one-time browser sign-in..."
    gh auth login --hostname github.com --git-protocol https --web
    gh auth status --hostname github.com *> $null
    if ($LASTEXITCODE -ne 0) { $canRelease = $false; Warn "GitHub CLI still not signed in - APK release upload will be skipped." }
  }
  if ($canRelease) { Ok "GitHub CLI signed in" }
} else {
  Warn "GitHub CLI (gh) not installed - APK upload will be skipped. Install: winget install GitHub.cli"
}

# Android toolchain present? (JDK 21 or Android Studio JBR + SDK build-tools)
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$hasJdk = (Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -ErrorAction SilentlyContinue | Where-Object Name -match '(^|[^0-9])21') -or
          (Test-Path (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\java.exe'))
$hasBt  = [bool](Get-ChildItem (Join-Path $sdk 'build-tools') -Directory -ErrorAction SilentlyContinue)
$doApk  = (-not $WebOnly) -and $hasJdk -and $hasBt -and $canRelease
if ($WebOnly)      { Ok "Web-only mode requested" }
elseif ($doApk)    { Ok "Android toolchain found - will build website + signed APK" }
else               { Warn "Android toolchain or GitHub CLI missing - deploying WEBSITE ONLY this time" }

# ---------------------------------------------------------------- 2. Sync with GitHub
Step "Syncing with GitHub"
git fetch origin main --quiet
if ($LASTEXITCODE -ne 0) { Fail "Could not reach GitHub. Check your internet connection." }
$behind = [int](git rev-list --count HEAD..origin/main)
if ($behind -gt 0) {
  Warn "GitHub has $behind newer commit(s) - pulling them in first"
  git pull --rebase --autostash origin main
  if ($LASTEXITCODE -ne 0) { git rebase --abort *> $null; Fail "Your local changes conflict with GitHub. Open the folder in VS Code and resolve the conflict." }
}
Ok "Up to date with origin/main"

# ---------------------------------------------------------------- 3. Dependencies (only when needed)
Step "Checking npm packages"
$stamp = Join-Path $Root 'node_modules\.package-lock.json'
$needInstall = (-not (Test-Path $stamp)) -or ((Get-Item 'package-lock.json').LastWriteTime -gt (Get-Item $stamp).LastWriteTime)
if ($needInstall) {
  Warn "Installing packages (only happens when package-lock.json changes)..."
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { npm install --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { Fail "npm install failed" } }
}
Ok "Packages ready"

# ---------------------------------------------------------------- 4. Fail fast before bumping
Step "Type-checking (before changing the version number)"
npx tsc -b
if ($LASTEXITCODE -ne 0) { Fail "TypeScript errors found - version NOT bumped, nothing published." }
Ok "No type errors"

# ---------------------------------------------------------------- 5. Release
Step "Releasing (version bump, build, push$(if ($doApk) {', signed APK'}))"
$releaseArgs = @{ Message = $Message }
if ($doApk) { $releaseArgs.Apk = $true }
& (Join-Path $PSScriptRoot 'release.ps1') @releaseArgs
if ($LASTEXITCODE -ne 0) { Fail "Release step failed (see messages above)" }

# ---------------------------------------------------------------- 6. Verify live
$Version = (node -p "require('./package.json').version").Trim()
Step "Waiting for $LiveUrl to serve v$Version"
$live = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $v = Invoke-RestMethod "$LiveUrl/version.json?t=$([DateTime]::UtcNow.Ticks)" -TimeoutSec 10 -Headers @{ 'Cache-Control' = 'no-cache' }
    if ("$($v.version)" -eq $Version) { $live = $true; break }
  } catch { }
  Start-Sleep -Seconds 5
}
if ($live) { Ok "Vercel is live with v$Version" } else { Warn "Vercel has not shown v$Version yet (it can take a few more minutes). Check https://vercel.com/six2768-6832/bcs-bank-by-okz/deployments" }

if ($doApk) {
  $assets = gh release view "v$Version" --repo $Repo --json assets -q '.assets[].name' 2>$null
  if ($assets -match [regex]::Escape($ApkName)) { Ok "APK attached to GitHub release v$Version" } else { Warn "APK not found on release v$Version" }
}

$sw.Stop()
Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  ALL DONE in $([int]$sw.Elapsed.TotalSeconds)s  -  OZ's BCS Bank v$Version" -ForegroundColor Green
Write-Host "  Website : $LiveUrl" -ForegroundColor Green
Write-Host "  Mirror  : https://six-planets.github.io/bcs-bank-by-okz/" -ForegroundColor Green
if ($doApk) { Write-Host "  APK     : https://github.com/$Repo/releases/latest/download/$ApkName" -ForegroundColor Green }
Write-Host "================================================================`n" -ForegroundColor Green
if ($live) { Start-Process $LiveUrl }
exit 0
