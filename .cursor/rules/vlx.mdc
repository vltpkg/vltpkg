---
description: vlt exec / exec-local / exec-cache commands and @vltpkg/vlx
globs: src/cli-sdk/src/commands/exec.ts,src/cli-sdk/src/commands/exec-local.ts,src/cli-sdk/src/commands/exec-cache.ts,src/vlx/src/*.ts,www/docs/content/client/commands/exec*.mdx
alwaysApply: false
---
# Exec Commands & vlx

## `vlt exec` (alias: `x`)

Runs a command from a package, installing into XDG data dir if needed. **Never modifies local `node_modules`.**

Resolution order:
1. If `--package=<pkg>` set → use that package
2. If arg0 found in local `node_modules/.bin` → run it (no install)
3. Otherwise treat arg0 as package spec → install to exec cache → run default bin

Local dir spec (arg0 or `--package`: `.`, `./x`, `file:x`; relative to cwd) → bins shimmed into XDG cache `vlt/vlx-local/<key>` (keyed by dir, bins, shebangs; never rewritten), run in place, nothing installed. Path-like arg0 skips the `.bin` lookup.

Default bin inference: single `bin` entry, or `bin` matching package name (after `/` for scoped).

```bash
vlt exec eslint src/            # local or install + run
vlt exec --package=typescript@5 tsc   # explicit package
vlt exec                        # no args → interactive shell with local bins in PATH
```

## `vlt exec-local` (alias: `xl`)

Runs command with local `node_modules/.bin` prepended to PATH. No remote installs. No args → spawns interactive shell.

## `vlt exec-cache` (alias: `xc`)

Manage the exec cache (XDG data dir installations).

| Subcommand | Description |
|------------|-------------|
| `ls` | List cached packages (filter by name or key) |
| `info <key>` | Extended info about a cached install |
| `install <spec>...` | Pre-install packages into exec cache |
| `delete [key...]` | Remove cached packages (all if no args) |

## `@vltpkg/vlx` Module (`src/vlx/src/`)

Entry point re-exports:

- `vlx.resolve(positionals, options, promptFn?)` → `string | undefined` — core resolution logic: find local bin → find local package → install to cache → infer default executable. Returns `undefined` for interactive shell.
- `vlx.install(spec, options, promptFn?)` → `VlxInfo` — install to XDG exec cache
- `vlx.list()` → cached package list
- `vlx.info(key)` → `VlxInfo` for a cached install
- `vlx.delete(keys)` — remove from cache

### Key Types

```typescript
type VlxInfo = {
  name: string, version?: string,
  path: string,      // synthetic project dir (cache), projectRoot (local), or shim dir (local dir spec)
  resolved: string,  // registry resolution or file URL for local
  arg0?: string,     // inferred default bin path
  integrity?: Integrity, signatures?: Resolution['signatures']
}
```

### Internal Helpers

- `findExecutable(arg0, projectRoot)` — searches `node_modules/.bin`
- `findPackage(name, projectRoot, packageJson)` — checks local install satisfies
- `localDir(spec)` — abs path if spec is a local dir
- `vlxLocal(dir, packageJson)` — shims a local dir's bins, no install
- `inferDefaultExecutable(manifest)` — picks bin from manifest
- `inferName(spec)` — package name from spec
- `doPrompt(promptFn, spec, path, resolution)` — confirmation before install
