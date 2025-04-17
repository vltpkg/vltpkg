$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
if (-not (Test-Path "$RootDir\.build-bundle\vlr.js")) {
  & {
    Set-Location "$RootDir"
    pnpm vlt-build --bins=vlr --outdir=".build-bundle" bundle > $null 2>&1
  }
}
& {
  $env:NODE_OPTIONS = "--enable-source-maps"
  node "$RootDir\.build-bundle\vlr.js" @ScriptArgs
}
