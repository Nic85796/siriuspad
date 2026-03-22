param(
  [string]$Repo = "SiriusXofc/siriuspad"
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error "SiriusPad install error: $Message"
  exit 1
}

try {
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
} catch {
  Fail "could not fetch the latest release for $Repo. Make sure a release is published."
}

$extension = ".exe"
$asset = $release.assets | Where-Object { $_.browser_download_url -like "*$extension" } | Select-Object -First 1

if (-not $asset) {
  Fail "latest release does not contain a $extension asset yet."
}

$tempDir = Join-Path $env:TEMP "siriuspad-install"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
$assetPath = Join-Path $tempDir $asset.name

Write-Host "Downloading $($asset.browser_download_url)"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $assetPath

Write-Host "Running EXE installer..."
Start-Process -FilePath $assetPath -ArgumentList "/S" -Wait

Write-Host "SiriusPad install completed successfully."
