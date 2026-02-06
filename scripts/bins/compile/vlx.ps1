$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
if (-not (Test-Path "$RootDir\.build-compile\vlx.exe")) {
  & {
    Set-Location "$RootDir"
    vlx vlt-build --bins=vlx --outdir=".build-compile" compile > $null 2>&1
  }
}
& {
  & "$RootDir\.build-compile\vlx.exe" @ScriptArgs
}
