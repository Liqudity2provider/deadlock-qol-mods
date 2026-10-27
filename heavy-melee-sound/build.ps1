param(
  [Parameter(Mandatory=$true)][string]$Csdk,          # e.g. D:\Reduced_CSDK_12
  [string]$Addon = "heavymelee",
  [string]$Boosted = "boosted",
  [string]$Out = "dist\pak58_dir.vpk"
)
$ErrorActionPreference = "Stop"
$rc = Join-Path $Csdk "game\bin\win64\resourcecompiler.exe"
if (!(Test-Path $rc)) { throw "resourcecompiler.exe not found under $Csdk" }
$content = Join-Path $Csdk "content\citadel_addons\$Addon"
$game    = Join-Path $Csdk "game\citadel_addons\$Addon"
New-Item -ItemType Directory -Force $content, $game | Out-Null
Get-ChildItem -Recurse -File -Filter *.wav $Boosted | ForEach-Object {
  $rel = $_.FullName.Substring((Resolve-Path $Boosted).Path.Length + 1)
  $dst = Join-Path $content $rel
  New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
  Copy-Item $_.FullName $dst -Force
  & $rc -i $dst -r -game (Join-Path $Csdk "game\citadel_addons\$Addon") | Out-Null
  Write-Host "compiled $rel"
}
# collect only the sound resources and pack
$stage = "stage"; if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
Get-ChildItem -Recurse -File -Filter *.vsnd_c $game | ForEach-Object {
  $rel = $_.FullName.Substring($game.Length + 1)
  $dst = Join-Path $stage $rel
  New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
  Copy-Item $_.FullName $dst -Force
}
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
if (Get-Command modlock -ErrorAction SilentlyContinue) {
  modlock vpk pack $stage -o $Out
} else {
  & (Join-Path $Csdk "game\bin\win64\CSDKCfgVPK.exe") $stage $Out
}
Write-Host "-> $Out  (copy to Deadlock\game\citadel\addons\)"
