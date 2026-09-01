$ErrorActionPreference = 'Stop'

# Draws the 440x280 small promo tile the Chrome Web Store listing requires.
# Text is deliberately free of Google trademarks.

. (Join-Path $PSScriptRoot 'icon-art.ps1')

$outputDir = Join-Path $PSScriptRoot '..\store-assets'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$width = 440
$height = 280

$tile = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($tile)
$graphics.SmoothingMode = 'AntiAlias'
$graphics.InterpolationMode = 'HighQualityBicubic'
$graphics.TextRenderingHint = 'ClearTypeGridFit'

$background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point 0, 0),
  (New-Object System.Drawing.Point $width, $height),
  [System.Drawing.Color]::FromArgb(255, 26, 28, 34),
  [System.Drawing.Color]::FromArgb(255, 15, 16, 20)
)
$graphics.FillRectangle($background, 0, 0, $width, $height)
$background.Dispose()

$iconSize = 92
$icon = New-ExtensionIcon -Size $iconSize
$graphics.DrawImage($icon, [int](($width - $iconSize) / 2), 34, $iconSize, $iconSize)
$icon.Dispose()

$centered = New-Object System.Drawing.StringFormat
$centered.Alignment = 'Center'

$titleFont = New-Object System.Drawing.Font('Segoe UI', 23, [System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 245, 247, 250))
$graphics.DrawString(
  'Photo Search Carousel',
  $titleFont,
  $titleBrush,
  (New-Object System.Drawing.RectangleF 0, 150, $width, 40),
  $centered
)

$taglineFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Regular)
$taglineBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 150, 157, 170))
$graphics.DrawString(
  'Full-resolution theatre mode for image search',
  $taglineFont,
  $taglineBrush,
  (New-Object System.Drawing.RectangleF 0, 192, $width, 30),
  $centered
)

$accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 46, 196, 182))
$graphics.FillRectangle($accent, [int](($width - 56) / 2), 232, 56, 3)
$accent.Dispose()

$titleFont.Dispose()
$taglineFont.Dispose()
$titleBrush.Dispose()
$taglineBrush.Dispose()
$graphics.Dispose()

$tilePath = Join-Path $outputDir 'promo-tile-440x280.png'
$tile.Save($tilePath, [System.Drawing.Imaging.ImageFormat]::Png)
$tile.Dispose()

Write-Output ("promo tile written: {0}" -f $tilePath)
