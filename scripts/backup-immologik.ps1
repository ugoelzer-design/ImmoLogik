param(
  [string]$BackupRoot = (Join-Path $PSScriptRoot "..\backups"),
  [switch]$SkipDatabase,
  [switch]$SkipMinio,
  [switch]$SkipCodeArchive
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-WarnMessage {
  param([string]$Message)
  Write-Warning $Message
}

function Get-EnvValue {
  param(
    [string]$EnvFilePath,
    [string]$Key
  )

  if (-not (Test-Path $EnvFilePath)) {
    return $null
  }

  $line = Get-Content $EnvFilePath | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  return ($line -split "=", 2)[1]
}

function Test-DockerAvailable {
  try {
    docker version *> $null
    return $true
  }
  catch {
    return $false
  }
}

function Resolve-BackupRootPath {
  param(
    [string]$RepoRoot,
    [string]$RequestedBackupRoot
  )

  if ([System.IO.Path]::IsPathRooted($RequestedBackupRoot)) {
    $rootQualifier = Split-Path -Path $RequestedBackupRoot -Qualifier
    if ($rootQualifier -and -not (Test-Path $rootQualifier)) {
      throw "Backup-Laufwerk nicht gefunden: $rootQualifier"
    }

    return [System.IO.Path]::GetFullPath($RequestedBackupRoot)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $RequestedBackupRoot))
}

function New-CodeSnapshot {
  param(
    [string]$RepoRoot,
    [string]$TargetDirectory,
    [string]$Timestamp
  )

  $snapshotRoot = Join-Path $TargetDirectory "repo-snapshot"
  $archivePath = Join-Path $TargetDirectory "immologik-code-$Timestamp.zip"

  New-Item -ItemType Directory -Path $snapshotRoot -Force | Out-Null

  $includePaths = @(
    "apps",
    "Immocloud",
    ".env",
    ".env.example",
    ".gitignore",
    ".gitattributes",
    "docker-compose.yml",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml"
  )

  foreach ($relativePath in $includePaths) {
    $sourcePath = Join-Path $RepoRoot $relativePath
    if (-not (Test-Path $sourcePath)) {
      continue
    }

    $destinationPath = Join-Path $snapshotRoot $relativePath
    $destinationParent = Split-Path $destinationPath -Parent

    if ($destinationParent) {
      New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    }

    $item = Get-Item $sourcePath
    if ($item.PSIsContainer) {
      New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
      $null = robocopy $sourcePath $destinationPath /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XD node_modules .next dist .git /XF *.log *.bak *.bak.*
      if ($LASTEXITCODE -gt 7) {
        throw "Kopieren von '$relativePath' fehlgeschlagen (robocopy exit code $LASTEXITCODE)."
      }
    }
    else {
      Copy-Item -Path $sourcePath -Destination $destinationPath -Force
    }
  }

  Get-ChildItem -Path $snapshotRoot -File -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "\.bak($|\.)" -or $_.Name -like "*.log" } |
    Remove-Item -Force -ErrorAction SilentlyContinue

  if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
  }

  Compress-Archive -Path (Join-Path $snapshotRoot "*") -DestinationPath $archivePath -CompressionLevel Optimal
  Remove-Item $snapshotRoot -Recurse -Force

  return $archivePath
}

function Backup-Postgres {
  param(
    [string]$TargetDirectory,
    [string]$Timestamp,
    [string]$RepoRoot
  )

  $envFile = Join-Path $RepoRoot ".env"
  $dbName = Get-EnvValue -EnvFilePath $envFile -Key "POSTGRES_DB"
  $dbUser = Get-EnvValue -EnvFilePath $envFile -Key "POSTGRES_USER"
  $dbPassword = Get-EnvValue -EnvFilePath $envFile -Key "POSTGRES_PASSWORD"

  if (-not $dbName -or -not $dbUser -or -not $dbPassword) {
    throw "POSTGRES_DB, POSTGRES_USER oder POSTGRES_PASSWORD fehlen in .env."
  }

  $dumpFile = Join-Path $TargetDirectory "postgres-$Timestamp.sql"
  $command = @(
    "exec",
    "-T",
    "-e", "PGPASSWORD=$dbPassword",
    "postgres",
    "pg_dump",
    "-U", $dbUser,
    "-d", $dbName
  )

  $dumpContent = & docker compose $command 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Postgres-Dump fehlgeschlagen: $dumpContent"
  }

  Set-Content -Path $dumpFile -Value $dumpContent -Encoding UTF8
  return $dumpFile
}

function Backup-MinioVolume {
  param(
    [string]$TargetDirectory,
    [string]$Timestamp
  )

  $archiveFile = Join-Path $TargetDirectory "minio-data-$Timestamp.tar.gz"
  $volumeName = "immologik-local_minio_data"

  & docker run --rm `
    -v "${volumeName}:/source:ro" `
    -v "${TargetDirectory}:/backup" `
    alpine sh -c "tar -czf /backup/$(Split-Path $archiveFile -Leaf) -C /source ." 2>&1 | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "MinIO-Volume-Backup fehlgeschlagen."
  }

  return $archiveFile
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupRootResolved = Resolve-BackupRootPath -RepoRoot $repoRoot -RequestedBackupRoot $BackupRoot
$targetDirectory = Join-Path $backupRootResolved $timestamp

New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null

$summary = [ordered]@{}

if (-not $SkipCodeArchive) {
  Write-Step "Erstelle Code- und Konfigurationsarchiv"
  $summary["code_archive"] = New-CodeSnapshot -RepoRoot $repoRoot -TargetDirectory $targetDirectory -Timestamp $timestamp
}

$dockerAvailable = Test-DockerAvailable
if (-not $dockerAvailable -and (-not $SkipDatabase -or -not $SkipMinio)) {
  Write-WarnMessage "Docker ist nicht erreichbar. Datenbank- und MinIO-Backup werden übersprungen."
}

if (-not $SkipDatabase -and $dockerAvailable) {
  try {
    Write-Step "Erstelle Postgres-Dump"
    $summary["postgres_dump"] = Backup-Postgres -TargetDirectory $targetDirectory -Timestamp $timestamp -RepoRoot $repoRoot
  }
  catch {
    Write-WarnMessage $_.Exception.Message
  }
}

if (-not $SkipMinio -and $dockerAvailable) {
  try {
    Write-Step "Sichere MinIO-Datenvolume"
    $summary["minio_archive"] = Backup-MinioVolume -TargetDirectory $targetDirectory -Timestamp $timestamp
  }
  catch {
    Write-WarnMessage $_.Exception.Message
  }
}

$summaryFile = Join-Path $targetDirectory "backup-summary.txt"
$summaryLines = @(
  "Backup created: $(Get-Date -Format s)"
  "Repository root: $repoRoot"
  "Target directory: $targetDirectory"
  ""
)

foreach ($entry in $summary.GetEnumerator()) {
  $summaryLines += "$($entry.Key): $($entry.Value)"
}

Set-Content -Path $summaryFile -Value $summaryLines -Encoding UTF8

Write-Host ""
Write-Host "Backup abgeschlossen." -ForegroundColor Green
Write-Host "Ablage: $targetDirectory"
Write-Host "Zusammenfassung: $summaryFile"
