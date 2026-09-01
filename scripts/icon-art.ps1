Add-Type -AssemblyName System.Drawing

# Shared artwork for the extension icon: a dark "theatre" plate holding a bright
# photo card, flanked by dimmed slivers that suggest the neighbouring carousel
# items. Deliberately avoids Google's four-colour palette.

$script:PlateColor = [System.Drawing.Color]::FromArgb(255, 22, 24, 29)
$script:CardColor = [System.Drawing.Color]::FromArgb(255, 246, 248, 251)
$script:SliverColor = [System.Drawing.Color]::FromArgb(70, 255, 255, 255)
$script:SunColor = [System.Drawing.Color]::FromArgb(255, 255, 159, 28)
$script:HillColor = [System.Drawing.Color]::FromArgb(255, 46, 196, 182)

function New-RoundedPath {
  param([single]$X, [single]$Y, [single]$W, [single]$H, [single]$Radius)

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = [single]([Math]::Min($Radius, [Math]::Min($W, $H) / 2) * 2)

  if ($diameter -le 0) {
    $path.AddRectangle((New-Object System.Drawing.RectangleF $X, $Y, $W, $H))
    return $path
  }

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc(($X + $W - $diameter), $Y, $diameter, $diameter, 270, 90)
  $path.AddArc(($X + $W - $diameter), ($Y + $H - $diameter), $diameter, $diameter, 0, 90)
  $path.AddArc($X, ($Y + $H - $diameter), $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-ExtensionIcon {
  param([int]$Size)

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = 'AntiAlias'
  $graphics.InterpolationMode = 'HighQualityBicubic'
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $s = [single]$Size
  # Below 32px the slivers collapse into noise, so the card takes the full plate.
  $compact = $Size -lt 32

  $platePath = New-RoundedPath -X 0 -Y 0 -W $s -H $s -Radius ($s * 0.21)
  $graphics.FillPath((New-Object System.Drawing.SolidBrush $script:PlateColor), $platePath)
  $platePath.Dispose()

  if (-not $compact) {
    foreach ($x in @(0.055, 0.805)) {
      $sliverPath = New-RoundedPath -X ($s * $x) -Y ($s * 0.31) -W ($s * 0.14) -H ($s * 0.38) -Radius ($s * 0.04)
      $graphics.FillPath((New-Object System.Drawing.SolidBrush $script:SliverColor), $sliverPath)
      $sliverPath.Dispose()
    }
  }

  $cardX = if ($compact) { $s * 0.14 } else { $s * 0.235 }
  $cardY = if ($compact) { $s * 0.16 } else { $s * 0.19 }
  $cardW = if ($compact) { $s * 0.72 } else { $s * 0.53 }
  $cardH = if ($compact) { $s * 0.68 } else { $s * 0.62 }

  $cardPath = New-RoundedPath -X $cardX -Y $cardY -W $cardW -H $cardH -Radius ($s * 0.075)
  $graphics.FillPath((New-Object System.Drawing.SolidBrush $script:CardColor), $cardPath)
  $graphics.SetClip($cardPath)

  $sunSize = $cardW * 0.24
  $graphics.FillEllipse(
    (New-Object System.Drawing.SolidBrush $script:SunColor),
    ($cardX + $cardW * 0.16),
    ($cardY + $cardH * 0.15),
    $sunSize,
    $sunSize
  )

  $points = @(
    (New-Object System.Drawing.PointF (($cardX - $cardW * 0.05), ($cardY + $cardH * 1.05))),
    (New-Object System.Drawing.PointF (($cardX + $cardW * 0.34), ($cardY + $cardH * 0.46))),
    (New-Object System.Drawing.PointF (($cardX + $cardW * 0.60), ($cardY + $cardH * 0.79))),
    (New-Object System.Drawing.PointF (($cardX + $cardW * 0.76), ($cardY + $cardH * 0.58))),
    (New-Object System.Drawing.PointF (($cardX + $cardW * 1.05), ($cardY + $cardH * 1.05)))
  )
  $graphics.FillPolygon((New-Object System.Drawing.SolidBrush $script:HillColor), $points)

  $graphics.ResetClip()
  $cardPath.Dispose()
  $graphics.Dispose()

  return $bitmap
}
