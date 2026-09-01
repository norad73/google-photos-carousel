$ErrorActionPreference = 'Stop'

# Produces dist/photo-search-carousel-v<version>.zip containing only the files
# Chrome actually loads, with manifest.json at the archive root as the Chrome
# Web Store requires.

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist = Join-Path $root 'dist'
$staging = Join-Path $dist 'package'

$manifestPath = Join-Path $root 'manifest.json'
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

$shipped = @('manifest.json', 'content.js', 'popup.html', 'popup.js', 'README.txt', 'icons')

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null

foreach ($item in $shipped) {
  $source = Join-Path $root $item
  if (-not (Test-Path $source)) { throw "Missing required item: $item" }
  Copy-Item -Path $source -Destination $staging -Recurse
}

# Every path the manifest points at must exist in the package, otherwise the
# upload fails review for a broken reference rather than anything substantive.
$referenced = New-Object System.Collections.Generic.List[string]
$manifest.icons.PSObject.Properties | ForEach-Object { $referenced.Add($_.Value) }
$manifest.action.default_icon.PSObject.Properties | ForEach-Object { $referenced.Add($_.Value) }
$referenced.Add($manifest.action.default_popup)
foreach ($entry in $manifest.content_scripts) {
  foreach ($file in $entry.js) { $referenced.Add($file) }
}

foreach ($relative in ($referenced | Sort-Object -Unique)) {
  if (-not (Test-Path (Join-Path $staging $relative))) {
    throw "manifest.json references a file that is not packaged: $relative"
  }
}

# Build tooling and any reintroduced third-party source art must never ship.
$forbidden = Get-ChildItem -Path $staging -Recurse -File |
  Where-Object { $_.Extension -eq '.ps1' -or $_.Name -like 'source-icon*' }

if ($forbidden) {
  throw "Files that must not ship were found in the package: $($forbidden.Name -join ', ')"
}

$zipPath = Join-Path $dist ("photo-search-carousel-v{0}.zip" -f $manifest.version)

# Built entry by entry rather than with Compress-Archive: on Windows PowerShell
# that cmdlet writes backslash separators, which violates the ZIP spec and can
# stop Chrome resolving nested paths such as icons/icon16.png.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  Get-ChildItem -Path $staging -Recurse -File | ForEach-Object {
    $entryName = $_.FullName.Substring($staging.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $entryName) | Out-Null
  }
} finally {
  $archive.Dispose()
}

Write-Output ("name    : {0}" -f $manifest.name)
Write-Output ("version : {0}" -f $manifest.version)
Write-Output ("zip     : {0}" -f $zipPath)
Write-Output ("size    : {0:N1} KB" -f ((Get-Item $zipPath).Length / 1KB))
Write-Output 'contents:'

Get-ChildItem -Path $staging -Recurse -File | ForEach-Object {
  Write-Output ("  {0}" -f $_.FullName.Substring($staging.Length + 1))
}
