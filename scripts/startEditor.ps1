param([switch]$noBrowser)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$bunPath = Join-Path $projectDirectory 'localRuntime\bun-windows-x64\bun.exe'
$entryPath = Join-Path $projectDirectory 'build\server\index.js'
$editorUrl = 'http://127.0.0.1:3000'

if (-not (Test-Path -LiteralPath $bunPath)) { throw 'Falta Bun local. Seguí las instrucciones de docs/editorLocal.md.' }
if (-not (Test-Path -LiteralPath $entryPath)) { throw 'Falta compilar el editor. Seguí las instrucciones de docs/editorLocal.md.' }

function editorIsReady {
  try {
    $page = Invoke-WebRequest -Uri $editorUrl -UseBasicParsing -TimeoutSec 2
    return $page.StatusCode -eq 200 -and $page.Content.Contains('<title>Editor Creativo')
  } catch { return $false }
}

if (-not (editorIsReady)) {
  $env:PATH = "$(Split-Path -Parent $bunPath);$env:PATH"
  $env:TOONFLOW_DATA_DIR = Join-Path $projectDirectory 'data'
  $env:TOONFLOW_SERVER_PORT = '3000'
  $env:NODE_ENV = 'production'
  $env:DO_NOT_TRACK = '1'
  $runtimeDirectory = Join-Path $projectDirectory 'localRuntime'
  $process = Start-Process -FilePath $bunPath -ArgumentList @('"' + $entryPath + '"') -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDirectory 'editorOut.log') -RedirectStandardError (Join-Path $runtimeDirectory 'editorErr.log') -PassThru
  $process.Id | Set-Content -LiteralPath (Join-Path $runtimeDirectory 'editor.pid') -Encoding ascii
  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if ($process.HasExited) { throw "El servidor no pudo arrancar. Revisá localRuntime/editorErr.log. Código: $($process.ExitCode)" }
    if (editorIsReady) { $ready = $true; break }
    Start-Sleep -Milliseconds 250
  }
  if (-not $ready) { throw 'El servidor no respondió a tiempo. Revisá localRuntime/editorErr.log y el puerto 3000.' }
}

Write-Output "Editor disponible en $editorUrl"
if (-not $noBrowser) {
  $chromeCandidates = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )
  $chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($chromePath) { Start-Process -FilePath $chromePath -ArgumentList @($editorUrl) }
  else { Start-Process $editorUrl }
}
