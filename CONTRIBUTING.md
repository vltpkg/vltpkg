# Contributing Guide

## Workspace Structure

The workspaces are divided among a few top-level directories.

### [`src`](./src/)

These workspaces are all are direct dependencies of the `vlt`
CLI.

The actual CLI is also a workspace in [`src/vlt`](./src/vlt/).

Most of these are also published separately under the `@vltpkg` scope.

### [`infra`](./infra/)

These workspaces are internal tools that we use for tasks like building,
bundling, and benchmarking the other workspaces.

These are internal and highly coupled to our monorepo setup, so they
are not published to any registry.

### [`www`](./www/)

These are websites that get deployed. Currently only [docs.vlt.sh](https://docs.vlt.sh).

## Linting / Formatting

Run `pnpm -w fix` to report any formatting or linting issues with your code,
and to attempt to fix them.

## Running TypeScript Directly

If you are on the latest version of Node, you can run TypeScript
files directly using `node --conditions=@vltpkg/source
./path/to/file.ts`.

In order to make this work for all places where we might spawn a
node process, run `export NODE_OPTIONS=--conditions=@vltpkg/source` to
set this in the environment, rather than on each command.

## `nave` Conveniences

If you use [nave](https://npm.im/nave) then you can enable `nave
auto` behavior in your bash profile by adding something like this:

```bash
# .bashrc or .bash_profile or wherever you put these things

__nave_prompt_command () {
  if nave should-auto; then
    exec nave auto
  fi
}

export PROMPT_COMMAND="__nave_prompt_command || true; ${PROMPT_COMMAND}"
```

Then, the appropriate node version and `NODE_OPTIONS` flags will
be set to be able to always run TypeScript files directly in the
context of this project.
