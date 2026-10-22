# Pelihalli - asennus Windowsiin
# Kaytto (PowerShell):  irm https://knh19.github.io/pelihalli/install.ps1 | iex
# Lataa uusimman Pelihalli.exe:n GitHubin Releases-sivulta, asentaa sen kansioon
# %LOCALAPPDATA%\Pelihalli ja tekee kuvakkeet tyopoydalle ja Kaynnista-valikkoon.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$url = 'https://github.com/knh19/pelihalli/releases/latest/download/Pelihalli-Windows.zip'
$dir = Join-Path $env:LOCALAPPDATA 'Pelihalli'
$tmp = Join-Path $env:TEMP ('pelihalli-' + [guid]::NewGuid().ToString('N'))
$zip = "$tmp.zip"

Write-Host ''
Write-Host '  >> PELIHALLI' -ForegroundColor Cyan
Write-Host '  Ladataan (noin 115 Mt), odota hetki...'
try {
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
} catch {
  Write-Host '  Lataus epaonnistui. Tarkista nettiyhteys ja yrita uudelleen.' -ForegroundColor Red
  return
}

Write-Host '  Asennetaan...'
Get-Process -Name 'Pelihalli' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
Expand-Archive -Path $zip -DestinationPath $tmp -Force
$src = Get-ChildItem -Path $tmp -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'Pelihalli.exe') } | Select-Object -First 1
if (-not $src) { Write-Host '  Paketista ei loytynyt Pelihalli.exe:a.' -ForegroundColor Red; return }
if (Test-Path $dir) { Remove-Item -Path $dir -Recurse -Force }
Move-Item -Path $src.FullName -Destination $dir
Remove-Item -Path $zip, $tmp -Recurse -Force -ErrorAction SilentlyContinue

$exe = Join-Path $dir 'Pelihalli.exe'
$shell = New-Object -ComObject WScript.Shell
$places = @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))
foreach ($p in $places) {
  $lnk = $shell.CreateShortcut((Join-Path $p 'Pelihalli.lnk'))
  $lnk.TargetPath = $exe
  $lnk.WorkingDirectory = $dir
  $ico = Join-Path (Split-Path $exe) 'resources\app\icon.ico'
  if (Test-Path $ico) { $lnk.IconLocation = "$ico,0" } else { $lnk.IconLocation = "$exe,0" }
  $lnk.Description = 'Pelihalli'
  $lnk.Save()
}

Write-Host '  Valmis! Pelihalli on tyopoydalla ja Kaynnista-valikossa.' -ForegroundColor Green
Write-Host '  Pelihalli paivittyy jatkossa itsestaan.'
Start-Process -FilePath $exe
