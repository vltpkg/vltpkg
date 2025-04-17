$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
if (-not (Test-Path "$RootDir\.build-compile\vlxl.exe")) {
  & {
    Set-Location "$RootDir"
    pnpm vlt-build --bins=vlxl --outdir=".build-compile" compile > $null 2>&1
  }
}
& {
  & "$RootDir\.build-compile\vlxl.exe" @ScriptArgs
}
