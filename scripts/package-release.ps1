$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$releaseDir = Join-Path $root "release"
$artifact = Join-Path $releaseDir "Meld-PC-Windows-v1.0.0.zip"

if (!(Test-Path $releaseDir)) {
  New-Item -ItemType Directory -Path $releaseDir | Out-Null
}

if (Test-Path $artifact) {
  Remove-Item -LiteralPath $artifact -Force
}

$distDir = Join-Path $root "dist"
$desktopDir = Join-Path $distDir "Meld-PC"
$binary = Join-Path $desktopDir "Meld-PC-win_x64.exe"
$resources = Join-Path $desktopDir "resources.neu"
$readme = Join-Path $root "README.md"

if ((Test-Path $binary) -and (Test-Path $resources)) {
  Compress-Archive -LiteralPath $binary, $resources, $readme -DestinationPath $artifact
} else {
  Compress-Archive -Path (Join-Path $desktopDir "*") -DestinationPath $artifact
}

Write-Host "Created $artifact"
