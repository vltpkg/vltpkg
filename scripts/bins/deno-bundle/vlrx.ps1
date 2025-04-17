$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
if (-not (Test-Path "$RootDir\.build-bundle\vlrx.js")) {
  & {
    Set-Location "$RootDir"
    pnpm vlt-build --bins=vlrx --outdir=".build-bundle" bundle > $null 2>&1
  }
}
& {
  deno -A "$RootDir\.build-bundle\vlrx.js" @ScriptArgs
}
