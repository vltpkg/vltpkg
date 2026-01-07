$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
if (-not (Test-Path "$RootDir\.build-bundle\vlxl.js")) {
  & {
    Set-Location "$RootDir"
    pnpm vlt-build --bins=vlxl --outdir=".build-bundle" bundle > $null 2>&1
  }
}
& {
  $env:NODE_OPTIONS = "--no-warnings --enable-source-maps"
  (Get-Command node).Source "$RootDir\.build-bundle\vlxl.js" @ScriptArgs
}
