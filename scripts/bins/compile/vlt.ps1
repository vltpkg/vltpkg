$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
if (-not (Test-Path "$RootDir\.build-compile\vlt.exe")) {
  & {
    Set-Location "$RootDir"
    pnpm vlt-build --bins=vlt --outdir=".build-compile" compile > $null 2>&1
  }
}
& {
  & "$RootDir\.build-compile\vlt.exe" @ScriptArgs
}
