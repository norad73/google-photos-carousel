$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'icon-art.ps1')

$iconsDir = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

foreach ($size in 16, 32, 48, 128) {
  $icon = New-ExtensionIcon -Size $size
  $icon.Save((Join-Path $iconsDir ("icon{0}.png" -f $size)), [System.Drawing.Imaging.ImageFormat]::Png)
  $icon.Dispose()
}

# 512 is not referenced by the manifest but the store listing asks for it.
$store = New-ExtensionIcon -Size 512
$store.Save((Join-Path $iconsDir 'store-icon-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$store.Dispose()

Write-Output 'icons written'
