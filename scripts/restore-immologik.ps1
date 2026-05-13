[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$BackupPath,
  [string]$BackupRoot = (Join-Path $PSScriptRoot "..\backups"),
  [switch]$Latest,
  [switch]$SkipCodeArchive,
  [switch]$SkipDatabase,
  [switch]$SkipMinio,
  [switch]$ForceCodeRestore,
  [switch]$ReplaceDatabase,
  [switch]$ReplaceMinioData,
  [switch]$StartServices
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
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

function Resolve-BackupDirectory {
  param(
    [string]$RequestedBackupPath,
    [string]$RequestedBackupRoot,
    [switch]$UseLatest
  )

  if ($RequestedBackupPath) {
    return (Resolve-Path $RequestedBackupPath).Path
  }

  $backupRootResolved = Resolve-BackupRootPath -RepoRoot $repoRoot -RequestedBackupRoot $RequestedBackupRoot

  if (-not (Test-Path $backupRootResolved)) {
    throw "Backup-Verzeichnis nicht gefunden: $backupRootResolved"
  }

  $directories = Get-ChildItem $backupRootResolved -Directory | Sort-Object Name -Descending
  if (-not $directories) {
    throw "Keine Backup-Ordner gefunden unter $backupRootResolved"
  }

  if ($UseLatest -or -not $RequestedBackupPath) {
    return $directories[0].FullName
  }

  return $directories[0].FullName
}

function Get-SingleBackupFile {
  param(
    [string]$Directory,
    [string]$Filter,
    [string]$Label
  )

  $files = Get-ChildItem -Path $Directory -File -Filter $Filter
  if (-not $files) {
    return $null
  }

  if ($files.Count -gt 1) {
    throw "Mehrere $Label-Dateien gefunden in $Directory"
  }

  return $files[0].FullName
}

function Restore-CodeArchive {
  param(
    [string]$ArchiveFile,
    [string]$RepoRoot,
    [switch]$AllowOverwrite
  )

  if (-not $AllowOverwrite) {
    throw "Code-Restore überschreibt Projektdateien. Bitte mit -ForceCodeRestore bestätigen."
  }

  $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("immologik-restore-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

  try {
    Expand-Archive -Path $ArchiveFile -DestinationPath $tempRoot -Force

    $entries = Get-ChildItem $tempRoot -Force
    foreach ($entry in $entries) {
      $sourcePath = $entry.FullName
      $destinationPath = Join-Path $RepoRoot $entry.Name

      if ($entry.PSIsContainer) {
        if ($PSCmdlet.ShouldProcess($destinationPath, "Restore code content")) {
          New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
          $null = robocopy $sourcePath $destinationPath /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XD node_modules .next dist .git
          if ($LASTEXITCODE -gt 7) {
            throw "Restore von '$($entry.Name)' fehlgeschlagen (robocopy exit code $LASTEXITCODE)."
          }
        }
      }
      else {
        if ($PSCmdlet.ShouldProcess($destinationPath, "Restore file")) {
          Copy-Item -Path $sourcePath -Destination $destinationPath -Force
        }
      }
    }
  }
  finally {
    Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Ensure-ComposeService {
  param([string]$ServiceName)

  if ($StartServices) {
    & docker compose up -d $ServiceName
    if ($LASTEXITCODE -ne 0) {
      throw "Service '$ServiceName' konnte nicht gestartet werden."
    }
  }
}

function Restore-Postgres {
  param(
    [string]$DumpFile,
    [string]$RepoRoot,
    [switch]$ReplaceExistingDatabase
  )

  $envFile = Join-Path $RepoRoot ".env"
  $dbName = Get-EnvValue -EnvFilePath $envFile -Key "POSTGRES_DB"
  $dbUser = Get-EnvValue -EnvFilePath $envFile -Key "POSTGRES_USER"
  $dbPassword = Get-EnvValue -EnvFilePath $envFile -Key "POSTGRES_PASSWORD"

  if (-not $dbName -or -not $dbUser -or -not $dbPassword) {
    throw "POSTGRES_DB, POSTGRES_USER oder POSTGRES_PASSWORD fehlen in .env."
  }

  Ensure-ComposeService -ServiceName "postgres"

  if ($ReplaceExistingDatabase) {
    if ($PSCmdlet.ShouldProcess($dbName, "Drop and recreate PostgreSQL database")) {
      $dropCommand = @(
        "exec",
        "-T",
        "-e", "PGPASSWORD=$dbPassword",
        "postgres",
        "psql",
        "-U", $dbUser,
        "-d", "postgres",
        "-v", "ON_ERROR_STOP=1",
        "-c", "DROP DATABASE IF EXISTS ""$dbName"" WITH (FORCE);",
        "-c", "CREATE DATABASE ""$dbName"";"
      )

      & docker compose $dropCommand
      if ($LASTEXITCODE -ne 0) {
        throw "Leeren/Neuanlegen der Datenbank '$dbName' fehlgeschlagen."
      }
    }
  }

  if ($PSCmdlet.ShouldProcess($dbName, "Restore PostgreSQL dump")) {
    $restoreCommand = @(
      "compose",
      "exec",
      "-T",
      "-e", "PGPASSWORD=$dbPassword",
      "postgres",
      "psql",
      "-U", $dbUser,
      "-d", $dbName,
      "-v", "ON_ERROR_STOP=1"
    )

    Get-Content -Path $DumpFile | & docker @restoreCommand
    if ($LASTEXITCODE -ne 0) {
      throw "Restore des PostgreSQL-Dumps fehlgeschlagen."
    }
  }
}

function Restore-MinioArchive {
  param(
    [string]$ArchiveFile,
    [switch]$ReplaceExistingData
  )

  Ensure-ComposeService -ServiceName "minio"

  $archiveName = Split-Path $ArchiveFile -Leaf
  $backupDirectory = Split-Path $ArchiveFile -Parent
  $volumeName = "immologik-local_minio_data"

  $clearSnippet = if ($ReplaceExistingData) {
    "find /target -mindepth 1 -maxdepth 1 -exec rm -rf {} +;"
  }
  else {
    ""
  }

  if ($PSCmdlet.ShouldProcess($volumeName, "Restore MinIO volume from archive")) {
    & docker run --rm `
      -v "${volumeName}:/target" `
      -v "${backupDirectory}:/backup:ro" `
      alpine sh -c "$clearSnippet tar -xzf /backup/$archiveName -C /target"

    if ($LASTEXITCODE -ne 0) {
      throw "Restore des MinIO-Archivs fehlgeschlagen."
    }
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$resolvedBackupDirectory = Resolve-BackupDirectory -RequestedBackupPath $BackupPath -RequestedBackupRoot $BackupRoot -UseLatest:$Latest

$codeArchive = Get-SingleBackupFile -Directory $resolvedBackupDirectory -Filter "immologik-code-*.zip" -Label "Code-Archiv"
$postgresDump = Get-SingleBackupFile -Directory $resolvedBackupDirectory -Filter "postgres-*.sql" -Label "Postgres-Dump"
$minioArchive = Get-SingleBackupFile -Directory $resolvedBackupDirectory -Filter "minio-data-*.tar.gz" -Label "MinIO-Archiv"

Write-Host "Backup-Quelle: $resolvedBackupDirectory"

$dockerAvailable = Test-DockerAvailable
if ((-not $SkipDatabase -or -not $SkipMinio) -and -not $dockerAvailable) {
  throw "Docker ist nicht erreichbar. Datenbank- und MinIO-Restore benötigen Docker."
}

if (-not $SkipCodeArchive) {
  if (-not $codeArchive) {
    throw "Kein Code-Archiv im Backup gefunden."
  }

  Write-Step "Stelle Code-Archiv wieder her"
  Restore-CodeArchive -ArchiveFile $codeArchive -RepoRoot $repoRoot -AllowOverwrite:$ForceCodeRestore
}

if (-not $SkipDatabase -and $postgresDump) {
  Write-Step "Stelle PostgreSQL-Dump wieder her"
  Restore-Postgres -DumpFile $postgresDump -RepoRoot $repoRoot -ReplaceExistingDatabase:$ReplaceDatabase
}
elseif (-not $SkipDatabase) {
  Write-Step "Kein PostgreSQL-Dump im Backup gefunden, Schritt wird übersprungen"
}

if (-not $SkipMinio -and $minioArchive) {
  Write-Step "Stelle MinIO-Daten wieder her"
  Restore-MinioArchive -ArchiveFile $minioArchive -ReplaceExistingData:$ReplaceMinioData
}
elseif (-not $SkipMinio) {
  Write-Step "Kein MinIO-Archiv im Backup gefunden, Schritt wird übersprungen"
}

Write-Host ""
Write-Host "Restore abgeschlossen." -ForegroundColor Green
