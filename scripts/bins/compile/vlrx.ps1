$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
if (-not (Test-Path "$RootDir\.build-compile\vlrx.exe")) {
  & {
    Set-Location "$RootDir"
    pnpm vlt-build --bins=vlrx --outdir=".build-compile" compile > $null 2>&1
  }
}
& {
  & "$RootDir\.build-compile\vlrx.exe" @ScriptArgs
}
