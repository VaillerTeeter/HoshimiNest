# Download aria2c for Tauri sidecar (Windows x86_64)
# Run from the repo root: .\scripts\download-aria2.ps1

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

$TargetDir = "$PSScriptRoot\..\src-tauri\binaries"
$TargetName = "aria2c-x86_64-pc-windows-msvc.exe"
$TargetPath = Join-Path $TargetDir $TargetName

if (Test-Path $TargetPath) {
    Out-ColorLine "aria2c already exists at $TargetPath" Green
    exit 0
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

# Get latest release from GitHub
Out-ColorLine "Fetching latest aria2 release info..." Cyan
$Release = Invoke-RestMethod "https://api.github.com/repos/aria2/aria2/releases/latest"
$Asset = $Release.assets | Where-Object { $_.name -match "win-64.*zip$" } | Select-Object -First 1

if (-not $Asset) {
    Write-Error "Could not find aria2 Windows 64-bit release asset"
}

$ZipUrl = $Asset.browser_download_url
$ZipName = $Asset.name
$TmpZip = Join-Path $env:TEMP $ZipName
$TmpDir = Join-Path $env:TEMP "aria2-extract"

Out-ColorLine "Downloading $ZipName..." Cyan
Invoke-WebRequest -Uri $ZipUrl -OutFile $TmpZip -UseBasicParsing

Out-ColorLine "Extracting..." Cyan
Remove-Item $TmpDir -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $TmpZip -DestinationPath $TmpDir

$Exe = Get-ChildItem -Path $TmpDir -Recurse -Filter "aria2c.exe" | Select-Object -First 1
if (-not $Exe) { Write-Error "aria2c.exe not found in archive" }

Copy-Item $Exe.FullName -Destination $TargetPath
Remove-Item $TmpZip -Force
Remove-Item $TmpDir -Recurse -Force

Out-ColorLine "Done: $TargetPath" Green
