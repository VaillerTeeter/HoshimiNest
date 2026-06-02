# Download mkvmerge for Tauri sidecar (Windows x86_64)
# Run from the repo root: .\scripts\download-mkvmerge.ps1

$ErrorActionPreference = "Stop"

function Out-ColorLine {
    param([string]$Message, [string]$Color = 'White')
    $ansiMap = @{
        White = 37
        Green = 32
        Blue = 34
        Red = 31
        Yellow = 33
        Cyan = 36
        Magenta = 35
    }
    $code = if ($ansiMap.ContainsKey($Color)) { $ansiMap[$Color] } else { 37 }
    Write-Output "$([char]27)[${code}m${Message}$([char]27)[0m"
}

$TargetDir = "$PSScriptRoot\.\..\src-tauri\binaries"
$TargetName = "mkvmerge-x86_64-pc-windows-msvc.exe"
$TargetPath = Join-Path $TargetDir $TargetName

if (Test-Path $TargetPath) {
    Out-ColorLine "mkvmerge already exists at $TargetPath" Green
    exit 0
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

# ── Step 1: Resolve latest MKVToolNix version from Chocolatey API ────────
Out-ColorLine "Fetching latest MKVToolNix release info..." Cyan
$chocoPkgBase = 'https://community.chocolatey.org/api/v2/Packages()'
$chocoPkgUri = $chocoPkgBase + '?$filter=Id eq ''mkvtoolnix'' and IsLatestVersion eq true'
$PkgMeta = Invoke-RestMethod $chocoPkgUri
$FullVersion = $PkgMeta.properties.Version   # e.g. "99.0.0"
# mkvtoolnix.download uses "99.0" not "99.0.0"
$Version = $FullVersion -replace '\.0$', ''
Out-ColorLine "Latest version: $Version" Cyan

$DownloadUrl = "https://mkvtoolnix.download/windows/releases/$Version/mkvtoolnix-64-bit-$Version.7z"
$TmpDir = Join-Path $env:TEMP "mkvtoolnix-extract"
$Tmp7z = Join-Path $env:TEMP "mkvtoolnix-$Version.7z"
$Tmp7zr = Join-Path $env:TEMP "7zr.exe"

# ── Step 2: Download 7-zip standalone extractor ──────────────────────────
if (-not (Test-Path $Tmp7zr)) {
    Out-ColorLine "Downloading 7zr.exe (standalone extractor)..." Cyan
    Invoke-WebRequest -Uri "https://www.7-zip.org/a/7zr.exe" -OutFile $Tmp7zr -UseBasicParsing
}

# ── Step 3: Download MKVToolNix portable archive ─────────────────────────
Out-ColorLine "Downloading MKVToolNix $Version portable..." Cyan
Invoke-WebRequest -Uri $DownloadUrl -OutFile $Tmp7z -UseBasicParsing

# ── Step 4: Extract only mkvmerge.exe ────────────────────────────────────
Out-ColorLine "Extracting mkvmerge.exe..." Cyan
Remove-Item $TmpDir -Recurse -Force -ErrorAction SilentlyContinue
# Extract a single file to keep it fast (skips ~100 MB of other binaries/docs)
& $Tmp7zr e $Tmp7z "-o$TmpDir" "mkvmerge.exe" -r -y | Out-Null

$Exe = Get-ChildItem -Path $TmpDir -Recurse -Filter "mkvmerge.exe" | Select-Object -First 1
if (-not $Exe) {
    Write-Error "mkvmerge.exe not found in archive — check the download URL: $DownloadUrl"
}

Copy-Item $Exe.FullName -Destination $TargetPath

# ── Cleanup ───────────────────────────────────────────────────────────────
Remove-Item $Tmp7z -Force -ErrorAction SilentlyContinue
Remove-Item $TmpDir -Recurse -Force -ErrorAction SilentlyContinue
# 7zr.exe left in %TEMP% for potential reuse; remove if you prefer:
# Remove-Item $Tmp7zr -Force -ErrorAction SilentlyContinue

Out-ColorLine "Done: $TargetPath" Green
