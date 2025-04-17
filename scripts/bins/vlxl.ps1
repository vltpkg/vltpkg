$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
& {
  $env:NODE_OPTIONS = "--no-warnings --experimental-strip-types --enable-source-maps"
  node "$RootDir\infra\build\src\bins\vlxl.ts" @ScriptArgs
}
