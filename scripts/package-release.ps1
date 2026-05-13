$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$version = "1.3.0"
$releaseDir = Join-Path $root "release"
$stageDir = Join-Path $releaseDir "installer-staging"
$artifact = Join-Path $releaseDir "Meld-PC-Setup-v$version.exe"
$sedFile = Join-Path $releaseDir "meld-pc-iexpress.sed"
$desktopDir = Join-Path $root "dist\Meld-PC"
$binary = Join-Path $desktopDir "Meld-PC-win_x64.exe"
$resources = Join-Path $desktopDir "resources.neu"
$readme = Join-Path $root "README.md"
$installerScript = Join-Path $root "scripts\install.ps1"
$discordRpcScript = Join-Path $root "scripts\discord-rpc.ps1"

if (!(Test-Path $binary)) {
  throw "Missing Neutralino binary. Run npm run desktop:build first."
}

if (!(Test-Path $resources)) {
  throw "Missing Neutralino resources.neu. Run npm run desktop:build first."
}

if (!(Test-Path $installerScript)) {
  throw "Missing installer script at $installerScript."
}

if (!(Test-Path $discordRpcScript)) {
  throw "Missing Discord RPC script at $discordRpcScript."
}

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
if (Test-Path $stageDir) {
  Remove-Item -LiteralPath $stageDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stageDir | Out-Null

Copy-Item -LiteralPath $binary -Destination (Join-Path $stageDir "Meld-PC-win_x64.exe") -Force
Copy-Item -LiteralPath $resources -Destination (Join-Path $stageDir "resources.neu") -Force
Copy-Item -LiteralPath $readme -Destination (Join-Path $stageDir "README.md") -Force
Copy-Item -LiteralPath $installerScript -Destination (Join-Path $stageDir "install.ps1") -Force
Copy-Item -LiteralPath $discordRpcScript -Destination (Join-Path $stageDir "discord-rpc.ps1") -Force

if (Test-Path $artifact) {
  Remove-Item -LiteralPath $artifact -Force
}

$oldZip = Join-Path $releaseDir "Meld-PC-Windows-v1.0.0.zip"
if (Test-Path $oldZip) {
  Remove-Item -LiteralPath $oldZip -Force
}

$stageForSed = $stageDir.TrimEnd('\') + "\"
$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=Meld PC has been installed.
TargetName=$artifact
FriendlyName=Meld PC Setup
AppLaunched=powershell.exe -NoProfile -ExecutionPolicy Bypass -File install.ps1
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$stageForSed
[SourceFiles0]
Meld-PC-win_x64.exe=
resources.neu=
install.ps1=
discord-rpc.ps1=
README.md=
"@

Set-Content -LiteralPath $sedFile -Value $sed -Encoding ASCII

$iexpress = Join-Path $env:SystemRoot "System32\iexpress.exe"
if (!(Test-Path $iexpress)) {
  throw "IExpress was not found at $iexpress."
}

& $iexpress /N /Q $sedFile

$deadline = (Get-Date).AddSeconds(15)
while (!(Test-Path $artifact) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 250
}

if (!(Test-Path $artifact)) {
  throw "IExpress did not create $artifact."
}

Write-Host "Created $artifact"
