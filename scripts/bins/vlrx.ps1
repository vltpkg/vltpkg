$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
& {
  $env:NODE_OPTIONS = "--no-warnings --enable-source-maps --experimental-strip-types"
  node "$RootDir\infra\build\src\bins\vlrx.ts" @ScriptArgs
}
