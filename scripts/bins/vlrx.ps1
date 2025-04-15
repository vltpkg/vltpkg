$ScriptDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$nodeArgs = $args
& { 
  $env:NODE_OPTIONS = "--no-warnings --experimental-strip-types --enable-source-maps"
  node "$ScriptDir\infra\build\src\bins\vlrx.ts" @nodeArgs
}
