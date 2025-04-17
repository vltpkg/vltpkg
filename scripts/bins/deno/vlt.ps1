$ScriptArgs = $args
$RootDir = (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
& {
  deno -A --unstable-node-globals --unstable-bare-node-builtins "$RootDir\infra\build\src\bins\vlt.ts" @ScriptArgs
}
