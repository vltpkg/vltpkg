$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
& {
  $env:NODE_OPTIONS = "--no-warnings --enable-source-maps --experimental-strip-types"
  $env:__VLT_INTERNAL_LIVE_RELOAD = "1"
  (Get-Command node).Source "$RootDir\infra\build\src\bins\vlrx.ts" @ScriptArgs
}
