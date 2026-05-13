$ErrorActionPreference = "Stop"

$installDir = Join-Path $env:LOCALAPPDATA "Meld PC"
$sourceDir = $PSScriptRoot
$sourceExe = Join-Path $sourceDir "Meld-PC-win_x64.exe"
$sourceResources = Join-Path $sourceDir "resources.neu"
$targetExe = Join-Path $installDir "Meld-PC.exe"
$targetResources = Join-Path $installDir "resources.neu"
$programsDir = [Environment]::GetFolderPath("Programs")
$desktopDir = [Environment]::GetFolderPath("DesktopDirectory")
$startMenuDir = Join-Path $programsDir "Meld PC"

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null

Copy-Item -LiteralPath $sourceExe -Destination $targetExe -Force
Copy-Item -LiteralPath $sourceResources -Destination $targetResources -Force

$readme = Join-Path $sourceDir "README.md"
if (Test-Path $readme) {
  Copy-Item -LiteralPath $readme -Destination (Join-Path $installDir "README.md") -Force
}

$shell = New-Object -ComObject WScript.Shell

function New-MeldShortcut {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )

  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $targetExe
  $shortcut.WorkingDirectory = $installDir
  $shortcut.Description = "Meld PC for Windows"
  $shortcut.IconLocation = "$targetExe,0"
  $shortcut.Save()
}

New-MeldShortcut -Path (Join-Path $startMenuDir "Meld PC.lnk")
New-MeldShortcut -Path (Join-Path $desktopDir "Meld PC.lnk")

Start-Process -FilePath $targetExe -WorkingDirectory $installDir
