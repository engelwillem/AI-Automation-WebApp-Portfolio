param(
  [string]$SshHost = "209.42.27.90",
  [string]$SshUser = "thechoosentalks",
  [string]$SshKeyPath = "$env:USERPROFILE/.ssh/cpanel_laptop_deploy",
  [string]$RemoteAppPath = "/home/thechoosentalks/deploy/apps/thechoosentalks/current",
  [string]$LocalMariaContainer = "tct-mariadb",
  [string]$LocalDbName = "thechoosentalks",
  [string]$LocalDbRootUser = "root",
  [string]$LocalDbRootPassword = "root",
  [string]$BackupDir = "backups/db-parity",
  [string[]]$VerifyTables = @("users", "bible_verses", "member_posts", "channels", "verse_relationships", "study_paths"),
  [switch]$KeepRemoteDump,
  [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Assert-PathExists {
  param([string]$Path, [string]$Label)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label not found: $Path"
  }
}

function New-SqlCountQuery {
  param([string[]]$Tables)

  if ($Tables.Count -eq 0) {
    throw "VerifyTables cannot be empty."
  }

  $parts = @()
  foreach ($table in $Tables) {
    if ([string]::IsNullOrWhiteSpace($table)) { continue }
    $parts += "SELECT '$table' AS table_name, COUNT(*) AS row_count FROM ``$table``"
  }

  if ($parts.Count -eq 0) {
    throw "VerifyTables contains no valid table names."
  }

  return ($parts -join " UNION ALL ")
}

function Parse-CountLines {
  param([string[]]$Lines)

  $result = @{}
  foreach ($line in $Lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $cols = $line -split "`t"
    if ($cols.Count -lt 2) { continue }
    $name = $cols[0].Trim()
    $count = [int64]$cols[1].Trim()
    $result[$name] = $count
  }

  return $result
}

if ($Help) {
  Write-Output @'
Usage:
  pwsh -File scripts/db-sync-prod-to-local.ps1

Optional examples:
  pwsh -File scripts/db-sync-prod-to-local.ps1 -SshHost 209.42.27.90 -SshUser thechoosentalks
  pwsh -File scripts/db-sync-prod-to-local.ps1 -KeepRemoteDump
'@
  exit 0
}

Assert-Command -Name "docker"
Assert-Command -Name "ssh"
Assert-Command -Name "scp"

$resolvedKeyPath = (Resolve-Path -LiteralPath $SshKeyPath).Path
Assert-PathExists -Path $resolvedKeyPath -Label "SSH key"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path (Get-Location) $BackupDir
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$localBackupPath = Join-Path $backupRoot "local-before-sync-$timestamp.sql"
$prodDumpLocalPath = Join-Path $backupRoot "prod-sync-$timestamp.sql"
$remoteDumpPath = "/tmp/prod-sync-$timestamp.sql"

$sshArgs = @("-i", $resolvedKeyPath, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=30")

Write-Step "Checking local MariaDB container '$LocalMariaContainer'"
$containerCheck = & docker inspect --format "{{.State.Running}}" $LocalMariaContainer 2>$null
if ($LASTEXITCODE -ne 0 -or ($containerCheck | Select-Object -First 1) -ne "true") {
  throw "Container '$LocalMariaContainer' is not running. Start Docker Compose first."
}

Write-Step "Creating local rollback backup"
& docker exec $LocalMariaContainer mariadb-dump "-u$LocalDbRootUser" "-p$LocalDbRootPassword" --single-transaction --quick $LocalDbName > $localBackupPath
if ($LASTEXITCODE -ne 0) {
  throw "Local backup failed."
}

Write-Step "Creating production dump on remote host via SSH"
$appEsc = $RemoteAppPath -replace "'", "'`"`"'"
$dumpEsc = $remoteDumpPath -replace "'", "'`"`"'"
$remoteDumpTemplate = @'
set -euo pipefail
APP_PATH='__APP_PATH__'
DUMP_PATH='__DUMP_PATH__'
cd "$APP_PATH"
DB_HOST="$(grep '^DB_HOST=' .env | cut -d= -f2-)"
DB_PORT="$(grep '^DB_PORT=' .env | cut -d= -f2-)"
DB_DATABASE="$(grep '^DB_DATABASE=' .env | cut -d= -f2-)"
DB_USERNAME="$(grep '^DB_USERNAME=' .env | cut -d= -f2-)"
DB_PASSWORD="$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)"
/usr/bin/mariadb-dump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" --single-transaction --quick --routines --triggers --events > "$DUMP_PATH"
test -s "$DUMP_PATH"
'@
$remoteDumpScript = $remoteDumpTemplate.Replace('__APP_PATH__', $appEsc).Replace('__DUMP_PATH__', $dumpEsc).Replace("`r", "")
$remoteDumpScript | & ssh @sshArgs "$SshUser@$SshHost" "tr -d '\r' | bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Remote production dump failed."
}

Write-Step "Downloading production dump via SCP"
& scp -i $resolvedKeyPath -o StrictHostKeyChecking=accept-new "${SshUser}@${SshHost}:$remoteDumpPath" $prodDumpLocalPath
if ($LASTEXITCODE -ne 0) {
  throw "SCP download failed."
}

if (-not $KeepRemoteDump) {
  Write-Step "Removing temporary dump from remote host"
  & ssh @sshArgs "$SshUser@$SshHost" "rm -f '$remoteDumpPath'"
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Failed to remove remote dump file. Remove it manually if needed."
  }
}

Write-Step "Recreating local database before import"
& docker exec $LocalMariaContainer mariadb "-u$LocalDbRootUser" "-p$LocalDbRootPassword" -e "DROP DATABASE IF EXISTS $LocalDbName; CREATE DATABASE $LocalDbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to recreate local database."
}

Write-Step "Importing production dump into local Docker MariaDB"
& docker cp $prodDumpLocalPath "${LocalMariaContainer}:/tmp/prod-sync.sql"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to copy dump into MariaDB container."
}

& docker exec $LocalMariaContainer sh -lc "mariadb --binary-mode=1 -u$LocalDbRootUser -p$LocalDbRootPassword $LocalDbName < /tmp/prod-sync.sql"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to import production dump into local DB."
}

Write-Step "Verifying parity counts (production vs local)"
$sql = New-SqlCountQuery -Tables $VerifyTables

$localLines = & docker exec $LocalMariaContainer mariadb -N -B "-u$LocalDbRootUser" "-p$LocalDbRootPassword" $LocalDbName -e $sql
if ($LASTEXITCODE -ne 0) {
  throw "Failed to query local verification counts."
}
$localMap = Parse-CountLines -Lines $localLines

$sqlBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($sql))
$prodCountTemplate = @'
set -euo pipefail
APP_PATH='__APP_PATH__'
SQL_B64='__SQL_B64__'
cd "$APP_PATH"
DB_HOST="$(grep '^DB_HOST=' .env | cut -d= -f2-)"
DB_PORT="$(grep '^DB_PORT=' .env | cut -d= -f2-)"
DB_DATABASE="$(grep '^DB_DATABASE=' .env | cut -d= -f2-)"
DB_USERNAME="$(grep '^DB_USERNAME=' .env | cut -d= -f2-)"
DB_PASSWORD="$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)"
SQL="$(printf '%s' "$SQL_B64" | base64 -d)"
mariadb -N -B -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" -e "$SQL"
'@
$prodCountScript = $prodCountTemplate.Replace('__APP_PATH__', $appEsc).Replace('__SQL_B64__', $sqlBase64).Replace("`r", "")
$prodLines = $prodCountScript | & ssh @sshArgs "$SshUser@$SshHost" "tr -d '\r' | bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to query production verification counts."
}
$prodMap = Parse-CountLines -Lines $prodLines

$mismatches = @()
foreach ($table in $VerifyTables) {
  $localCount = if ($localMap.ContainsKey($table)) { $localMap[$table] } else { -1 }
  $prodCount = if ($prodMap.ContainsKey($table)) { $prodMap[$table] } else { -1 }

  $status = if ($localCount -eq $prodCount) { "MATCH" } else { "DIFF" }
  Write-Host ("{0,-22} local={1,-8} prod={2,-8} {3}" -f $table, $localCount, $prodCount, $status)

  if ($localCount -ne $prodCount) {
    $mismatches += $table
  }
}

Write-Host ""
Write-Host "Local backup: $localBackupPath" -ForegroundColor DarkGray
Write-Host "Prod dump   : $prodDumpLocalPath" -ForegroundColor DarkGray

if ($mismatches.Count -gt 0) {
  throw "Parity verification failed for tables: $($mismatches -join ', ')"
}

Write-Host "DB parity sync completed successfully." -ForegroundColor Green
