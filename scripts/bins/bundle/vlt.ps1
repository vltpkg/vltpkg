$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
if (-not (Test-Path "$RootDir\.build-bundle\vlt.js")) {
  & {
    Set-Location "$RootDir"
    vlx vlt-build --bins=vlt --outdir=".build-bundle" bundle > $null 2>&1
  }
}
& {
  $env:NODE_OPTIONS = "--no-warnings --enable-source-maps"
  node "$RootDir\.build-bundle\vlt.js" @ScriptArgs
}
