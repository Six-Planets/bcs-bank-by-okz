<#
  BCS BANK BY OKZ - ONE-CLICK LOCALHOST
  Double-click "BCS Bank by OKZ - Localhost.bat". It:
    - reuses the server if it is already running (opens instantly)
    - installs npm packages only when needed
    - frees port 5174 if a dead/foreign process is holding it
    - starts Vite with hot reload, waits until it really answers, then opens the browser
    - prints a Wi-Fi (LAN) link so you can open the same app on your phone
#>
$ErrorActionPreference = 'Continue'
$Port = 5174
$Url  = "http://localhost:$Port/"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Ok($t)   { Write-Host "  [OK] $t" -ForegroundColor Green }
function Info($t) { Write-Host "  [..] $t" -ForegroundColor Cyan }
function Fail($t) { Write-Host "`n  [FAILED] $t" -ForegroundColor Red; Read-Host "Press Enter to close"; exit 1 }
function Alive {
  try { $r = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 2; return ($r.StatusCode -eq 200 -and $r.Content -match 'BCS Bank') } catch { return $false }
}

Write-Host "`n  BCS Bank by OKZ - Localhost" -ForegroundColor Magenta

# 1. Already running? open instantly
if (Alive) { Ok "Already running"; Start-Process $Url; Ok "Opened $Url"; exit 0 }

# 2. Tools
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js is not installed. Get the LTS version from https://nodejs.org" }

# 3. Port held by something that is not our app? free it
$holders = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $holders) { Info "Freeing port $Port (PID $p)"; Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }

# 4. Packages only when needed
$stamp = Join-Path $Root 'node_modules\.package-lock.json'
if ((-not (Test-Path $stamp)) -or ((Get-Item 'package-lock.json').LastWriteTime -gt (Get-Item $stamp).LastWriteTime)) {
  Info "Installing packages (first run or package-lock.json changed)..."
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { npm install --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { Fail "npm install failed" } }
}

# 5. Start Vite in its own minimized window (close that window to stop the server)
Info "Starting dev server..."
$vite = Join-Path $Root 'node_modules\vite\bin\vite.js'
Start-Process -FilePath 'cmd.exe' -WorkingDirectory $Root -WindowStyle Minimized `
  -ArgumentList '/k', "title BBBOKZ Localhost Server (close to stop) && node `"$vite`" --port $Port --strictPort --host 0.0.0.0"

# 6. Wait until it truly answers (max ~40s), then open
for ($i = 0; $i -lt 80; $i++) { if (Alive) { break }; Start-Sleep -Milliseconds 500 }
if (-not (Alive)) { Fail "Server did not start. Open the minimized 'BBBOKZ Localhost Server' window to see the error." }

Start-Process $Url
Ok "Running at $Url  (hot reload on - edits show instantly)"
$lan = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -First 1 -ExpandProperty IPAddress
if ($lan) { Ok "Phone on same Wi-Fi: http://${lan}:$Port/" }
Start-Sleep -Seconds 3
exit 0
