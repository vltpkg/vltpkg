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
files directly using `node ./path/to/file.ts`.

If you are on Node 22, you can use `node --experimental-strip-types`.

For both of those options you will see a warning. If that bothers you
then you can run with `--no-warnings` as well.

In order to make this work for all places where we might spawn a
node process, run `export NODE_OPTIONS=--experimental-strip-types --no-warnings` to
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

## Root Level Scripts

This root of this repo has scripts for each named bin that
can be run via `pnpm` for testing locally.

These scripts set the corret `NODE_OPTIONS` to run the TypeScript
source directly.

In order to silence all the output from `pnpm` and only see the `vlt`
output, it is helpful to pass the `-s` flag to `pnpm`.

```bash
$ pnpm -s vlt --version
0.0.0-0
```

## Testing Builds

Building for publishing is handled by the [`infra/build`](./infra/build) workspace.

There are some root level scripts that can be run to generate these
builds for testing locally.

```bash
# creates a directory at .build-bundle with all the bundled JS
pnpm build:bundle

# creates a directory at .build-compile with the compiled binaries
# for the current os and cpu
pnpm build:compile
```

Both of those commands take an `--action` flag which can be set to `pack` or `publish`.

Setting it to `pack` will additionally run `npm pack` on the built directories to
generate a `.tgz` file.

Setting it to `publish` will run `npm publish --dry-run` on the built directories.
Use this to see which packages would be published and with what access, tag,
and registry. If you really want to do the real thing use the `--forReal` flag

### Other Platforms

To generate compiled builds for other platforms use the `--platform` and `--arch` flags.

```bash
# create bins for all platform/arch combinations
pnpm build:compile --platform=all --arch=all
```
