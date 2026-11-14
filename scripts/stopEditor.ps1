$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$pidPath = Join-Path $projectDirectory 'localRuntime\editor.pid'
$bunPath = Join-Path $projectDirectory 'localRuntime\bun-windows-x64\bun.exe'
if (-not (Test-Path -LiteralPath $pidPath)) { Write-Output 'El editor no tiene un proceso de inicio registrado.'; exit 0 }
$editorProcessId = [int](Get-Content -LiteralPath $pidPath)
$process = Get-Process -Id $editorProcessId -ErrorAction SilentlyContinue
if ($process) {
  if ($process.Path -ne $bunPath) { throw 'El identificador pertenece a otro programa. No se detuvo ningún proceso.' }
  $killResult = & {
    $ErrorActionPreference = 'Continue'
    $output = taskkill.exe /PID $editorProcessId /T /F 2>&1
    [PSCustomObject]@{ ExitCode = $LASTEXITCODE; Output = $output }
  }
  $killExit = $killResult.ExitCode
  $remainingProcess = Get-Process -Id $editorProcessId -ErrorAction SilentlyContinue
  if ($killExit -ne 0 -and $remainingProcess -and $remainingProcess.Path -eq $bunPath) {
    $killResult.Output | Set-Content -LiteralPath (Join-Path $projectDirectory 'localRuntime\stopEditor.log')
    throw 'El servidor sigue activo. Revisá localRuntime/stopEditor.log.'
  }
}
Remove-Item -LiteralPath $pidPath -Force
Write-Output 'Editor detenido. Los proyectos se conservan.'
