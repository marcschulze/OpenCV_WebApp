[CmdletBinding()]
param(
  [switch]$Start
)

$ErrorActionPreference = "Stop"
$minimumNodeMajor = 18
$recommendedNodeMajor = 22
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-NodeInstallation {
  $command = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $command) {
    return $null
  }

  $versionText = (& $command.Source --version).Trim()
  $major = [int](($versionText.TrimStart("v").Split("."))[0])
  return [pscustomobject]@{
    Command = $command.Source
    Version = $versionText
    Major = $major
  }
}

Write-Host "OpenCV Vision Pipeline - Windows-Installation" -ForegroundColor Cyan
Write-Host "Projektordner: $projectRoot"

if ($PSVersionTable.PSVersion.Major -lt 5) {
  throw "PowerShell 5.1 oder neuer wird benoetigt."
}

$node = Get-NodeInstallation
if (-not $node -or $node.Major -lt $minimumNodeMajor) {
  if ($node) {
    Write-Host "Die vorhandene Node.js-Version $($node.Version) ist zu alt." -ForegroundColor Yellow
  } else {
    Write-Host "Node.js wurde nicht gefunden."
  }

  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "winget fehlt. Installiere zuerst 'App-Installer' aus dem Microsoft Store und starte dieses Skript erneut."
  }

  Write-Host "Installiere die aktuelle Node.js-LTS-Version ueber winget ..." -ForegroundColor Cyan
  & $winget.Source install --id OpenJS.NodeJS.LTS --exact --source winget --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "Die Node.js-Installation ist mit Exitcode $LASTEXITCODE fehlgeschlagen."
  }

  # Neu installierte Programme sind in der laufenden PowerShell noch nicht
  # immer im PATH enthalten. Deshalb wird der PATH fuer diesen Prozess erneuert.
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
  $node = Get-NodeInstallation
}

if (-not $node -or $node.Major -lt $minimumNodeMajor) {
  throw "Node.js $minimumNodeMajor oder neuer wurde nach der Installation nicht gefunden. Oeffne PowerShell neu und starte das Skript erneut."
}

Write-Host "Node.js: $($node.Version)" -ForegroundColor Green
if ($node.Major -lt $recommendedNodeMajor) {
  Write-Warning "Node.js $recommendedNodeMajor LTS oder neuer wird empfohlen."
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
  throw "npm wurde nicht gefunden. Repariere oder wiederhole die Node.js-Installation."
}
$npmVersion = (& $npm.Source --version).Trim()
Write-Host "npm: v$npmVersion" -ForegroundColor Green

$requiredFiles = @(
  "index.html",
  "app.js",
  "styles.css",
  "server.mjs",
  "package.json",
  "opencv.js"
)

foreach ($file in $requiredFiles) {
  $path = Join-Path $projectRoot $file
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Erforderliche Projektdatei fehlt: $file"
  }
}

$openCvPath = Join-Path $projectRoot "opencv.js"
if ((Get-Item -LiteralPath $openCvPath).Length -lt 1MB) {
  throw "opencv.js ist unvollstaendig oder beschaedigt."
}

Write-Host "Pruefe die JavaScript-Dateien ..." -ForegroundColor Cyan
& $node.Command --check (Join-Path $projectRoot "app.js")
if ($LASTEXITCODE -ne 0) { throw "app.js ist syntaktisch ungueltig." }
& $node.Command --check (Join-Path $projectRoot "server.mjs")
if ($LASTEXITCODE -ne 0) { throw "server.mjs ist syntaktisch ungueltig." }

Write-Host "Installation und Projektpruefung erfolgreich." -ForegroundColor Green
Write-Host "Zum Starten: cd `"$projectRoot`"; npm start"
Write-Host "Danach im Browser oeffnen: http://localhost:5173"

if ($Start) {
  Write-Host "Starte die App. Beenden mit Strg+C." -ForegroundColor Cyan
  Push-Location $projectRoot
  try {
    & $npm.Source start
  } finally {
    Pop-Location
  }
}
