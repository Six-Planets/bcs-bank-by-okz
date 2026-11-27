<#
  BCS BANK BY OKZ (BBBOKZ) — ONE-CLICK BEGINNER-PROOF RELEASE ENGINE
  ------------------------------------------------------------------
  Usage (or just double-click "BCS Bank by OKZ - Deploy.bat"):
    .\deploy\release.ps1          -> Auto-bump version & build, build web, update version.json, push to GitHub (auto-deploys Vercel + GitHub Pages).
    .\deploy\release.ps1 -Apk     -> Same + builds a signed BCS-Bank-by-OKZ.apk and uploads it to GitHub Releases so old APKs self-update in-app!
    .\deploy\release.ps1 -NoBump  -> Redeploy current version without incrementing version number.
#>
param(
  [switch]$Apk,
  [switch]$NoBump,
  [string]$Message = ""
)

$ErrorActionPreference = 'Continue'
$AppName = 'BCS Bank by OKZ'
$ApkName = 'BCS-Bank-by-OKZ.apk'
$Repo    = 'Six-Planets/bcs-bank-by-okz'
$Root    = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Step($t) { Write-Host "`n==> $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "    [OK] $t" -ForegroundColor Green }
function Warn($t) { Write-Host "    [WARN] $t" -ForegroundColor Yellow }
function Fail($t) { Write-Host "`n[FAILED] $t" -ForegroundColor Red; exit 1 }

function Get-NativeInfo {
  $f = Join-Path $PSScriptRoot 'native.json'
  if (Test-Path $f) { return Get-Content $f -Raw | ConvertFrom-Json }
  return [pscustomobject]@{
    code    = 1
    version = '2.0.0'
    apk     = "https://github.com/$Repo/releases/latest/download/$ApkName"
  }
}

function Find-AndroidTools {
  if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
  $jbr = Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'
  $jdk21 = Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -ErrorAction SilentlyContinue | Where-Object Name -match '(^|[^0-9])21' | Select-Object -Last 1
  if ($jdk21) { $env:JAVA_HOME = $jdk21.FullName }
  elseif (Test-Path "$jbr\bin\java.exe") { $env:JAVA_HOME = $jbr }
  else { Fail "Java JDK not found! Install Android Studio or JDK 21." }
  $env:Path = "$env:JAVA_HOME\bin;$env:Path"
  Ok "JAVA_HOME=$env:JAVA_HOME"

  $bt = Get-ChildItem (Join-Path $env:ANDROID_HOME 'build-tools') -Directory -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
  if (-not $bt) { Fail "Android build-tools not found in $env:ANDROID_HOME" }
  Ok "Build-Tools=$($bt.Name)"
  return $bt.FullName
}

function Invoke-Gradle([string]$Dir, [string]$Task, [string]$LogFile) {
  $stop = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'gradlew.bat --stop >nul 2>&1' -WorkingDirectory $Dir -WindowStyle Hidden -PassThru
  $stop.WaitForExit()
  Write-Host "    Running gradle $Task (log: $LogFile) ..."
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "gradlew.bat $Task --console=plain < nul > `"$LogFile`" 2>&1" -WorkingDirectory $Dir -WindowStyle Hidden -PassThru
  $p.WaitForExit()
  $rc = $p.ExitCode
  $stop2 = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'gradlew.bat --stop >nul 2>&1' -WorkingDirectory $Dir -WindowStyle Hidden -PassThru
  $stop2.WaitForExit()
  return $rc
}

function Write-VersionJson($Version, $BuildNum, $Native) {
  $obj = [ordered]@{
    version = $Version
    build   = [int]$BuildNum
    builtAt = (Get-Date).ToUniversalTime().ToString('o')
    native  = [ordered]@{
      code    = [int]$Native.code
      version = "$($Native.version)"
      apk     = "$($Native.apk)"
    }
  }
  $json = $obj | ConvertTo-Json -Depth 4
  [IO.File]::WriteAllText((Join-Path $Root 'public\version.json'), $json)
  if (Test-Path (Join-Path $Root 'dist')) {
    [IO.File]::WriteAllText((Join-Path $Root 'dist\version.json'), $json)
  }
  Ok "version.json updated (v$Version · Build $BuildNum · APK #$($Native.code))"
}

function Build-SignedApk($Version, $NextCode) {
  Step "Building Signed Android APK (v$Version, Build #$NextCode)"
  $bt = Find-AndroidTools

  $native = [ordered]@{
    code    = $NextCode
    version = $Version
    apk     = "https://github.com/$Repo/releases/latest/download/$ApkName"
  }
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot 'native.json'), ($native | ConvertTo-Json -Depth 3))

  $env:VITE_APP_VERSION = $Version
  npm run build
  if ($LASTEXITCODE -ne 0) { Fail "Web build for APK failed" }

  if (-not (Test-Path (Join-Path $Root 'android'))) {
    npx cap add android
    if ($LASTEXITCODE -ne 0) { Fail "npx cap add android failed" }
  }
  npx cap sync android
  if ($LASTEXITCODE -ne 0) { Fail "npx cap sync android failed" }

  # Stamp versionCode and versionName into android/app/build.gradle
  $gradle = Join-Path $Root 'android\app\build.gradle'
  $gText = Get-Content $gradle -Raw
  $gText = $gText -replace 'versionCode \d+', "versionCode $NextCode"
  $gText = $gText -replace 'versionName "[^"]*"', "versionName `"$Version`""
  [IO.File]::WriteAllText($gradle, $gText)

  "sdk.dir=$($env:ANDROID_HOME -replace '\\','\\')" | Set-Content -Encoding ascii (Join-Path $Root 'android\local.properties')

  # Persistent local keystore (never committed to git, never prompts for password!)
  $keysDir = Join-Path $PSScriptRoot '.keys'
  New-Item -ItemType Directory -Path $keysDir -Force | Out-Null
  $ks     = Join-Path $keysDir 'bbbokz-release.jks'
  $pwFile = Join-Path $keysDir 'bbbokz-keystore-password.txt'
  if (-not (Test-Path $pwFile)) { [guid]::NewGuid().ToString('N') | Set-Content -NoNewline $pwFile }
  $pw = (Get-Content $pwFile -Raw).Trim()

  if (-not (Test-Path $ks)) {
    & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $ks -alias bbbokz -keyalg RSA -keysize 2048 -validity 10000 -storepass $pw -keypass $pw -dname "CN=BCS Bank by OKZ, O=Obaidul Kader Zihad, C=BD"
    if ($LASTEXITCODE -ne 0) { Fail "keytool keystore generation failed" }
  }

  $logsDir = Join-Path $PSScriptRoot 'logs'
  New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
  $glog = Join-Path $logsDir 'gradle.log'

  $rc = Invoke-Gradle (Join-Path $Root 'android') 'assembleRelease' $glog
  if ($rc -ne 0) {
    Get-Content $glog -Tail 25
    Fail "Gradle assembleRelease failed (see deploy\logs\gradle.log)"
  }

  $unsigned = Join-Path $Root 'android\app\build\outputs\apk\release\app-release-unsigned.apk'
  if (-not (Test-Path $unsigned)) {
    $unsigned = Join-Path $Root 'android\app\build\outputs\apk\release\app-release.apk'
  }
  $aligned = Join-Path $env:TEMP 'bbbokz-aligned.apk'
  & "$bt\zipalign.exe" -p -f 4 $unsigned $aligned
  if ($LASTEXITCODE -ne 0) { Fail "zipalign failed" }

  $outApk = Join-Path $Root $ApkName
  & "$bt\apksigner.bat" sign --ks $ks --ks-key-alias bbbokz --ks-pass "pass:$pw" --key-pass "pass:$pw" --out $outApk $aligned
  if ($LASTEXITCODE -ne 0) { Fail "apksigner failed" }

  Remove-Item $aligned -Force -ErrorAction SilentlyContinue
  $sizeMB = [Math]::Round((Get-Item $outApk).Length / 1MB, 2)
  Ok "$ApkName built & signed ($sizeMB MB, Build #$NextCode)"
  return [pscustomobject]$native
}

# 1. Version & Build Number
Step "Preparing Release Version"
$Native = Get-NativeInfo
$CurrentBuild = [int]$Native.code
if (-not $NoBump) {
  npm version patch --no-git-tag-version --allow-same-version | Out-Null
  $NextBuild = $CurrentBuild + 1
} else {
  $NextBuild = $CurrentBuild
}
$Version = (node -p "require('./package.json').version").Trim()
Ok "$AppName v$Version (Build $NextBuild)"

# 2. Optional Signed Android APK Build
if ($Apk) {
  $Native = Build-SignedApk $Version $NextBuild
} else {
  # Web-only update bumps web build while keeping existing native.code intact
  $Native = Get-NativeInfo
}

# 3. Write version.json & Build Production Web Bundle
Step "Building Production Web Bundle"
Write-VersionJson $Version $NextBuild $Native
$env:VITE_APP_VERSION = $Version
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Production build failed" }
Write-VersionJson $Version $NextBuild $Native

# 4. Push to GitHub (triggers automatic Vercel + GitHub Pages deploy — zero passwords!)
Step "Publishing to GitHub (Auto-Deploys Website)"
git config http.postBuffer 524288000
git config http.version HTTP/1.1
git add -A
$commitMsg = if ($Message) { "Release v$Version (Build $NextBuild) - $Message" } else { "Release v$Version (Build $NextBuild)" }
git commit -m $commitMsg
git pull --rebase --autostash origin main
if ($LASTEXITCODE -ne 0) { git rebase --abort 2>$null; Fail "git pull --rebase failed (conflict with GitHub)" }
git push origin main
if ($LASTEXITCODE -ne 0) { Fail "git push failed" }
Ok "Pushed v$Version (Build $NextBuild) to $Repo"

# 5. Upload Signed APK to GitHub Releases so all old APKs self-update in-app!
if ($Apk) {
  Step "Publishing Signed APK to GitHub Releases"
  $tag = "v$Version"
  $apkPath = Join-Path $Root $ApkName
  $existing = gh release view $tag --repo $Repo 2>&1
  if ($LASTEXITCODE -eq 0) {
    gh release upload $tag $apkPath --repo $Repo --clobber
  } else {
    gh release create $tag $apkPath --repo $Repo --title "BCS Bank by OKZ v$Version (Build $NextBuild)" --notes "Automated signed Android APK release for BCS Bank by OKZ (BBBOKZ) v$Version (Build $NextBuild). Existing installed APKs will detect this update in-app automatically."
  }
  if ($LASTEXITCODE -ne 0) { Fail "GitHub Release APK upload failed" }
  Ok "APK live at: https://github.com/$Repo/releases/latest/download/$ApkName"
}

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "  RELEASE COMPLETE: $AppName v$Version (Build $NextBuild)" -ForegroundColor Green
Write-Host "  Website auto-updating via GitHub Pages & Vercel!" -ForegroundColor Green
if ($Apk) {
  Write-Host "  APK Download: https://github.com/$Repo/releases/latest/download/$ApkName" -ForegroundColor Green
}
Write-Host "================================================================`n" -ForegroundColor Green
