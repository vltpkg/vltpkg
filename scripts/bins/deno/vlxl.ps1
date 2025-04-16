$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
& {
  deno -A --unstable-node-globals --unstable-bare-node-builtins "$RootDir\infra\build\src\bins\vlxl.ts" @ScriptArgs
}
