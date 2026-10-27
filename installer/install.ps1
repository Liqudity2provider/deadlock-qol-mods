<#
  QoL HUD for Deadlock: installer / updater / doctor.
  Works on Windows PowerShell 5.1+ (no PS7-only syntax). ASCII only on purpose.

  -Action install    download latest release, place the VPK, patch gameinfo.gi, verify (default; safe to re-run = repair)
  -Action report     check everything, collect HUD lines from console.log, write qolhud-report.txt + clipboard
  -Action uninstall  remove our VPK; remove the addons search path only if no other addon VPKs remain

  Overrides for testing / offline: -DeadlockPath <dir>  -Source <local .vpk>  -Tag <release tag>  -Yes (no prompts)
#>
param(
  [ValidateSet("install", "report", "uninstall")][string]$Action = "install",
  [string]$DeadlockPath = $env:QOL_DEADLOCK_PATH,
  [string]$Source = "",
  [string]$Tag = "latest",
  [switch]$Yes
)

$ErrorActionPreference = "Stop"
$Repo      = "Liqudity2provider/deadlock-qol-mods"
$AssetName = "pak57_dir.vpk"
$Marker    = "qolhud.json"
$AppId     = "1422450"
$AddonsLine = "Game`t`t`t`tcitadel/addons"
$OwnMarkerBytes = "qol_menu"        # string present in our VPK directory tree

try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

# ---------------------------------------------------------------- output helpers
$script:Problems = New-Object System.Collections.ArrayList
$script:Log = New-Object System.Collections.ArrayList
function Say([string]$msg, [string]$color = "Gray") { [void]$script:Log.Add($msg); Write-Host $msg -ForegroundColor $color }
function Ok([string]$msg)   { Say ("  [ok]   " + $msg) "Green" }
function Warn([string]$msg) { Say ("  [warn] " + $msg) "Yellow"; [void]$script:Problems.Add("WARN: " + $msg) }
function Bad([string]$msg)  { Say ("  [fail] " + $msg) "Red";    [void]$script:Problems.Add("FAIL: " + $msg) }
function Step([string]$msg) { Say ""; Say ("== " + $msg) "Cyan" }

# ---------------------------------------------------------------- locate Deadlock
function Get-SteamRoots {
  $roots = New-Object System.Collections.ArrayList
  foreach ($key in @("HKCU:\Software\Valve\Steam", "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam", "HKLM:\SOFTWARE\Valve\Steam")) {
    try {
      $p = Get-ItemProperty -Path $key -ErrorAction Stop
      foreach ($n in @("SteamPath", "InstallPath")) { if ($p.$n) { [void]$roots.Add(($p.$n -replace "/", "\")) } }
    } catch {}
  }
  foreach ($d in @("C:\Program Files (x86)\Steam", "C:\Program Files\Steam", "D:\Steam", "D:\SteamLibrary", "E:\SteamLibrary")) { [void]$roots.Add($d) }
  return $roots | Select-Object -Unique
}

function Get-LibraryFolders([string]$steamRoot) {
  $libs = New-Object System.Collections.ArrayList
  [void]$libs.Add($steamRoot)
  $vdf = Join-Path $steamRoot "steamapps\libraryfolders.vdf"
  if (Test-Path $vdf) {
    foreach ($m in [regex]::Matches((Get-Content -Raw $vdf), '"path"\s+"([^"]+)"')) { [void]$libs.Add(($m.Groups[1].Value -replace "\\\\", "\")) }
  }
  return $libs
}

function Find-Deadlock {
  if ($DeadlockPath) {
    if (Test-Path (Join-Path $DeadlockPath "game\citadel\gameinfo.gi")) { return (Resolve-Path $DeadlockPath).Path }
    if (Test-Path (Join-Path $DeadlockPath "game/citadel/gameinfo.gi")) { return (Resolve-Path $DeadlockPath).Path }
    throw "No game\citadel\gameinfo.gi under -DeadlockPath '$DeadlockPath'"
  }
  foreach ($root in Get-SteamRoots) {
    if (-not (Test-Path $root)) { continue }
    foreach ($lib in Get-LibraryFolders $root) {
      $installdir = "Deadlock"
      $acf = Join-Path $lib "steamapps\appmanifest_$AppId.acf"
      if (Test-Path $acf) { $m = [regex]::Match((Get-Content -Raw $acf), '"installdir"\s+"([^"]+)"'); if ($m.Success) { $installdir = $m.Groups[1].Value } }
      $dir = Join-Path $lib ("steamapps\common\" + $installdir)
      if (Test-Path (Join-Path $dir "game\citadel\gameinfo.gi")) { return $dir }
    }
  }
  return $null
}

# ---------------------------------------------------------------- VPK helpers
function Read-VpkTree([string]$path) {
  # VPK v1/v2 header: sig(4) ver(4) treeSize(4) [v2: +16 bytes]. Returns the directory tree as text (filenames only).
  $fs = [IO.File]::OpenRead($path)
  try {
    $br = New-Object IO.BinaryReader($fs)
    $sig = $br.ReadUInt32(); if ($sig -ne 0x55aa1234) { return "" }
    $ver = $br.ReadUInt32(); $tree = $br.ReadUInt32()
    if ($ver -eq 2) { [void]$br.ReadBytes(16) }
    $len = [Math]::Min([int64]$tree, [int64]64MB)
    return [Text.Encoding]::ASCII.GetString($br.ReadBytes([int]$len))
  } finally { $fs.Close() }
}

function Get-Sha256([string]$path) { return (Get-FileHash -Algorithm SHA256 -Path $path).Hash.ToLower() }

# ---------------------------------------------------------------- gameinfo.gi
function Test-AddonsLine([string]$gi) { return [regex]::IsMatch((Get-Content -Raw $gi), '(?m)^\s*Game\s+citadel/addons\s*$') }

function Add-AddonsLine([string]$gi) {
  $text = [IO.File]::ReadAllText($gi)
  if ([regex]::IsMatch($text, '(?m)^\s*Game\s+citadel/addons\s*$')) { return $false }
  $nl = "`n"; if ($text.Contains("`r`n")) { $nl = "`r`n" }
  $rx = [regex]'(?s)(SearchPaths\s*\{[ \t]*\r?\n)([ \t]*)'
  $m = $rx.Match($text)
  if (-not $m.Success) { throw "SearchPaths block not found in gameinfo.gi (format changed?)" }
  $indent = $m.Groups[2].Value; if (-not $indent) { $indent = "`t`t`t" }
  $backup = $gi + ".qolhud.bak"
  if (-not (Test-Path $backup)) { Copy-Item $gi $backup }
  $new = $rx.Replace($text, ('$1' + $indent + $AddonsLine + $nl + '$2'), 1)
  [IO.File]::WriteAllText($gi, $new, (New-Object Text.UTF8Encoding($false)))
  return $true
}

function Remove-AddonsLine([string]$gi) {
  $text = [IO.File]::ReadAllText($gi)
  $new = [regex]::Replace($text, '(?m)^[ \t]*Game[ \t]+citadel/addons[ \t]*\r?\n', '')
  if ($new -ne $text) { [IO.File]::WriteAllText($gi, $new, (New-Object Text.UTF8Encoding($false))); return $true }
  return $false
}

# ---------------------------------------------------------------- release
function Get-Release {
  $api = "https://api.github.com/repos/$Repo/releases/" + $(if ($Tag -eq "latest") { "latest" } else { "tags/$Tag" })
  try {
    $r = Invoke-RestMethod -Uri $api -Headers @{ "User-Agent" = "qolhud-installer" } -TimeoutSec 20
    $a = $r.assets | Where-Object { $_.name -eq $AssetName } | Select-Object -First 1
    if (-not $a) { throw "release $($r.tag_name) has no $AssetName" }
    $sha = ""; if ($a.digest) { $sha = ($a.digest -replace "^sha256:", "").ToLower() }
    return @{ tag = $r.tag_name; url = $a.browser_download_url; sha = $sha }
  } catch {
    # API rate limit or offline: fall back to the stable latest-download URL + SHA256SUMS.txt
    $base = "https://github.com/$Repo/releases/latest/download"
    $sha = ""
    try { $sums = (Invoke-WebRequest -UseBasicParsing -Uri "$base/SHA256SUMS.txt" -TimeoutSec 20).Content
          $m = [regex]::Match($sums, "([0-9a-fA-F]{64})\s+\*?$AssetName"); if ($m.Success) { $sha = $m.Groups[1].Value.ToLower() } } catch {}
    return @{ tag = "latest"; url = "$base/$AssetName"; sha = $sha }
  }
}

# ---------------------------------------------------------------- shared checks
function Wait-GameClosed {
  $p = Get-Process -Name "deadlock" -ErrorAction SilentlyContinue
  if (-not $p) { return }
  if ($Yes) { throw "Deadlock is running. Close it and run again." }
  Say "  Deadlock is running. Close the game, then press Enter (mods load only at game start)." "Yellow"
  while (Get-Process -Name "deadlock" -ErrorAction SilentlyContinue) { [void](Read-Host) }
}

function Get-Ours([string]$addons) {
  $mf = Join-Path $addons $Marker
  if (Test-Path $mf) { try { return (Get-Content -Raw $mf | ConvertFrom-Json) } catch {} }
  return $null
}

function Find-Slot([string]$addons, $ours) {
  if ($ours -and $ours.file) { return $ours.file }
  $preferred = Join-Path $addons $AssetName
  if (-not (Test-Path $preferred)) { return $AssetName }
  if ((Read-VpkTree $preferred).Contains($OwnMarkerBytes)) { return $AssetName }   # ours, installed by hand
  for ($n = 50; $n -le 98; $n++) { $f = "pak{0:D2}_dir.vpk" -f $n; if (-not (Test-Path (Join-Path $addons $f))) { return $f } }
  throw "no free pakNN_dir.vpk slot in addons"
}

function Check-Conflicts([string]$addons, [string]$ourFile) {
  $hudMods = @()
  Get-ChildItem -Path $addons -Filter "pak*_dir.vpk" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Name -eq $ourFile) { return }
    $tree = ""; try { $tree = Read-VpkTree $_.FullName } catch {}
    if ($tree.Contains("base_hud")) { $hudMods += $_.Name }
  }
  if ($hudMods.Count -gt 0) {
    Warn ("other HUD mod(s) also replace base_hud: " + ($hudMods -join ", ") + ". Only one can work; the LOWER pak number wins. Ours: $ourFile")
  } else { Ok "no other mod replaces the HUD root" }
}

# ---------------------------------------------------------------- actions
function Do-Install {
  Step "Finding Deadlock"
  $dl = Find-Deadlock
  if (-not $dl) { Bad "Deadlock not found. Run again with -DeadlockPath ""D:\SteamLibrary\steamapps\common\Deadlock"""; return }
  Ok $dl
  $citadel = Join-Path $dl "game\citadel"; if (-not (Test-Path $citadel)) { $citadel = Join-Path $dl "game/citadel" }
  $addons = Join-Path $citadel "addons"; $gi = Join-Path $citadel "gameinfo.gi"
  Wait-GameClosed

  Step "Getting the mod"
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ("qolhud_" + [guid]::NewGuid().ToString("N") + ".vpk")
  $expected = ""; $tagName = "local"
  if ($Source) {
    Copy-Item $Source $tmp; Ok "local file $Source"
  } else {
    $rel = Get-Release; $tagName = $rel.tag; $expected = $rel.sha
    Say ("  downloading " + $rel.url)
    Invoke-WebRequest -UseBasicParsing -Uri $rel.url -OutFile $tmp -TimeoutSec 120
    Ok ("release " + $tagName + " (" + [Math]::Round((Get-Item $tmp).Length / 1KB) + " KB)")
  }
  $hash = Get-Sha256 $tmp
  if ($expected) {
    if ($hash -ne $expected) { Remove-Item $tmp -Force; Bad "checksum mismatch (download corrupted). Nothing was changed."; return }
    Ok "checksum verified"
  } else { Warn "no published checksum to compare against; sha256 $hash" }
  if (-not (Read-VpkTree $tmp).Contains($OwnMarkerBytes)) { Remove-Item $tmp -Force; Bad "downloaded file is not the QoL HUD VPK. Nothing was changed."; return }

  Step "Installing"
  if (-not (Test-Path $addons)) { New-Item -ItemType Directory -Path $addons | Out-Null; Ok "created addons folder" }
  $ours = Get-Ours $addons
  $slot = Find-Slot $addons $ours
  if ($slot -ne $AssetName) { Warn "$AssetName is taken by another mod; installing as $slot" }
  $dest = Join-Path $addons $slot
  Move-Item -Force $tmp $dest
  $info = @{ name = "QoL HUD"; version = $tagName; file = $slot; sha256 = $hash; installed_at = (Get-Date).ToString("s"); repo = $Repo }
  ($info | ConvertTo-Json) | Set-Content -Path (Join-Path $addons $Marker) -Encoding ASCII
  Ok ("placed " + $dest)
  if (Add-AddonsLine $gi) { Ok "gameinfo.gi: added 'Game citadel/addons' (backup: gameinfo.gi.qolhud.bak)" } else { Ok "gameinfo.gi already loads addons" }

  Step "Verifying"
  if ((Get-Sha256 $dest) -eq $hash) { Ok "installed file matches" } else { Bad "installed file differs from download" }
  if (Test-AddonsLine $gi) { Ok "gameinfo.gi loads citadel/addons" } else { Bad "gameinfo.gi still has no addons line" }
  Check-Conflicts $addons $slot

  Say ""
  if (($script:Problems | Where-Object { $_ -like "FAIL*" }).Count -eq 0) {
    Say "  Done. Start Deadlock; press the 'mods' button (top right of the HUD) for settings." "Green"
    Say "  After a Deadlock update, run this again: patches reset gameinfo.gi." "Gray"
  }
}

function Do-Report {
  Step "Checking install"
  $dl = Find-Deadlock
  if (-not $dl) { Bad "Deadlock not found" } else { Ok $dl }
  $lines = New-Object System.Collections.ArrayList
  if ($dl) {
    $citadel = Join-Path $dl "game\citadel"; if (-not (Test-Path $citadel)) { $citadel = Join-Path $dl "game/citadel" }
    $addons = Join-Path $citadel "addons"; $gi = Join-Path $citadel "gameinfo.gi"
    if (Test-AddonsLine $gi) { Ok "gameinfo.gi loads citadel/addons" } else { Bad "gameinfo.gi has no 'Game citadel/addons' line (run Install to repair)" }
    $ours = Get-Ours $addons
    if ($ours) {
      $f = Join-Path $addons $ours.file
      if (Test-Path $f) {
        Ok ("installed " + $ours.version + " as " + $ours.file)
        if ((Get-Sha256 $f) -ne $ours.sha256) { Warn "installed VPK was modified or replaced since install" }
        try { $rel = Get-Release; if ($rel.tag -ne "latest" -and $rel.tag -ne $ours.version) { Warn ("update available: " + $rel.tag + " (run Install)") } else { Ok "up to date" } } catch {}
      } else { Bad ("marker says " + $ours.file + " but the file is missing") }
      Check-Conflicts $addons $ours.file
    } else { Bad "QoL HUD is not installed" }
    Get-ChildItem -Path $addons -Filter "pak*_dir.vpk" -ErrorAction SilentlyContinue | ForEach-Object { Say ("         addon: " + $_.Name + "  " + [Math]::Round($_.Length / 1KB) + " KB") }
    if (Get-Process -Name "deadlock" -ErrorAction SilentlyContinue) { Say "         (Deadlock is running)" }

    Step "Reading the game console log"
    $log = Join-Path $citadel "console.log"
    if (Test-Path $log) {
      $age = (Get-Date) - (Get-Item $log).LastWriteTime
      Ok ("console.log, last written " + [Math]::Round($age.TotalMinutes) + " min ago")
      $rx = '\[Qol|panorama|Panorama|vjs_c|vxml_c|base_hud|sounds/.+\.vsnd|snd_showstart|SoundEvent'
      Get-Content $log -Tail 20000 | Where-Object { $_ -match $rx } | Select-Object -Last 300 | ForEach-Object { [void]$lines.Add($_) }
      if ($lines.Count -eq 0) { Warn "no HUD lines in console.log: the mod did not load, or the game was not started since install" }
      else {
        if ($lines | Where-Object { $_ -match "\[QolHud\] loaded|\[QolRoutes\]|\[QolParry\]" }) { Ok "HUD scripts are running in-game" }
        $errs = $lines | Where-Object { $_ -match "(?i)error|fail|missing" -and $_ -match "(?i)panorama|qol|vjs|vxml" }
        if ($errs) { Warn ("Panorama errors found: " + @($errs).Count + " (included in the report)") }
        $snd = $lines | Where-Object { $_ -match "sounds/.+\.vsnd" }
        if ($snd) { Ok ("sound paths captured: " + @($snd).Count) }
      }
    } else {
      Warn "no console.log. Add  -condebug  to Deadlock launch options (Steam > Deadlock > Properties > Launch options), play, then run Report again."
      try { Set-Clipboard -Value "-condebug" } catch {}
    }
  }

  $outDir = [Environment]::GetFolderPath("Desktop"); if (-not $outDir -or -not (Test-Path $outDir)) { $outDir = (Get-Location).Path }
  $out = Join-Path $outDir "qolhud-report.txt"
  $title = "QoL HUD report  " + (Get-Date).ToString("s")
  $sect  = "== console lines (" + $lines.Count + ")"
  $body = @($title, "", "== checks") + @($script:Log) + @("", $sect) + @($lines)
  [IO.File]::WriteAllLines($out, [string[]]$body, (New-Object Text.UTF8Encoding($false)))
  Say ""
  Say ("  Report saved: " + $out) "Green"
  try { Set-Clipboard -Value ($body -join "`r`n"); Say "  Also copied to clipboard: paste it into the chat." "Green" } catch {}
}

function Do-Uninstall {
  Step "Uninstalling"
  $dl = Find-Deadlock; if (-not $dl) { Bad "Deadlock not found"; return }
  $citadel = Join-Path $dl "game\citadel"; if (-not (Test-Path $citadel)) { $citadel = Join-Path $dl "game/citadel" }
  $addons = Join-Path $citadel "addons"; $gi = Join-Path $citadel "gameinfo.gi"
  Wait-GameClosed
  $ours = Get-Ours $addons
  if ($ours -and (Test-Path (Join-Path $addons $ours.file))) { Remove-Item -Force (Join-Path $addons $ours.file); Ok ("removed " + $ours.file) }
  elseif (Test-Path (Join-Path $addons $AssetName)) {
    if ((Read-VpkTree (Join-Path $addons $AssetName)).Contains($OwnMarkerBytes)) { Remove-Item -Force (Join-Path $addons $AssetName); Ok "removed $AssetName" }
  } else { Ok "QoL HUD VPK not present" }
  if (Test-Path (Join-Path $addons $Marker)) { Remove-Item -Force (Join-Path $addons $Marker) }
  $others = @(Get-ChildItem -Path $addons -Filter "pak*_dir.vpk" -ErrorAction SilentlyContinue)
  if ($others.Count -eq 0) { if (Remove-AddonsLine $gi) { Ok "gameinfo.gi: removed addons line (no other addon VPKs)" } }
  else { Ok ("kept the addons line: " + $others.Count + " other addon VPK(s) installed") }
  Say ""; Say "  Uninstalled." "Green"
}

Say "QoL HUD for Deadlock  -  $Action" "White"
try {
  switch ($Action) { "install" { Do-Install } "report" { Do-Report } "uninstall" { Do-Uninstall } }
} catch {
  Bad $_.Exception.Message
}
if (($script:Problems | Where-Object { $_ -like "FAIL*" }).Count -gt 0) { $global:LASTEXITCODE = 1 } else { $global:LASTEXITCODE = 0 }
