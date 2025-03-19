# Contributing Guide

## Workspace Structure

The workspaces are divided among a few top-level directories.

Be sure to check out the `CONTRIBUTING.md` file in the workspace where
changes are being made, as this may provide contribution guidance
specific to that component.

### [`src`](./src/)

These workspaces are all are direct dependencies of the `vlt` CLI.

The actual CLI is also a workspace in [`src/vlt`](./src/vlt/).

Most of these are also published separately under the `@vltpkg` scope.

### [`infra`](./infra/)

These workspaces are internal tools that we use for tasks like
building, bundling, and benchmarking the other workspaces.

These are internal and highly coupled to our monorepo setup, so they
are not published to any registry.

This directory also contains all the `cli-*` variants.

### [`www`](./www/)

These are websites that get deployed. Currently only
[docs.vlt.sh](https://docs.vlt.sh).

## Linting / Formatting

Run `pnpm -w fix` to report any formatting or linting issues with your
code, and to attempt to fix them.

## Running TypeScript Directly

If you are on the latest version of Node, you can run TypeScript files
directly using `node ./path/to/file.ts`.

If you are on Node 22, you can use `node --experimental-strip-types`.

For both of those options you will see a warning. If that bothers you
then you can run with `--no-warnings` as well.

In order to make this work for all places where we might spawn a node
process, run
`export NODE_OPTIONS=--experimental-strip-types --no-warnings` to set
this in the environment, rather than on each command.

## Using `nave`

If you use [nave](https://npm.im/nave) then you can enable `nave auto`
behavior in your bash profile by adding something like this:

```bash
# .bashrc or .bash_profile or wherever you put these things

__nave_prompt_command () {
  if nave should-auto; then
    exec nave auto
  fi
}

export PROMPT_COMMAND="__nave_prompt_command || true; ${PROMPT_COMMAND}"
```

Then, the appropriate node version and `NODE_OPTIONS` flags will be
set to be able to always run TypeScript files directly in the context
of this project.

## Using NVM

If you use [`nvm`](https://github.com/nvm-sh/nvm), a compatible
version of `node` should be automatically installed & used as defined
in our project's root `.nvmrc` file. Notably, there are known issues
in `node` versions `<22.14` and unknown compatibility for `>=23`. If
you are using a version outside of the known-good range set you are
likely to experience errors when developing and should install an
in-range version.

## Using `setup-node` in CI

Our CI uses the `setup-node` action and is explictely configured to
use the "latest", known-good version of `node` (`^22.14.0`) available.
You can find this configuration in `.github/workflows/*.yml`.

## Root Level Scripts

This root of this repo has scripts for each named bin that can be run
via `pnpm` for testing locally.

These scripts set the correct `NODE_OPTIONS` to run the TypeScript
source directly.

In order to silence all the output from `pnpm` and only see the `vlt`
output, it is helpful to pass the `-s` flag to `pnpm`.

```bash
$ pnpm -s vlt --version
0.0.0-0
```

## Running the CLI from Other Directories

A directory of `sh` executables is located at `./scripts/bins`. These
call the TypeScript source bin files with the correct `NODE_OPTIONS`.
This directory is designed to be put at the beginning of your path
temporarily to make running of `vlt` and its related CLIs run directly
from source.

```bash
export PATH=~/projects/vltpkg/vltpkg/scripts/bins:$PATH
vlt --version
```

## Publishing

All workspace directories are designed so `pnpm publish` can be run
from that directory.

On all pushes to `main` a GitHub Actions workflow will run to create a
release PR. That PR will be updated for all subsequent pushes. The PR
will contain any release related commits, usually just the bumping of
`package.json` version numbers.

When that PR is merged the same workflow will then publish the bumped
packages.

## Release Manager

The weekly release manager's role is to merge the release PR. Pretty
simple :smile:

The release PR will be created as a `draft`. When it is time to
release, merging other PRs should be temporarily paused and the
release PR should be:

1. Marked as ready for review
1. Approved
1. Merged

### Published CLI Packages

The following packages are published as part of the CLI:

- `vlt` The is the compiled variant of the CLI. This package only has
  placeholder bins that are swapped out in a postinstall for one of
  the platform variants below.
- `@vltpkg/cli-darmin-arm64`
- `@vltpkg/cli-darmin-x64`
- `@vltpkg/cli-linux-arm64`
- `@vltpkg/cli-linux-x64`
- `@vltpkg/cli-win32-x64`

Note that the platform specific variants do not have any
`package.json#bin` entries because that is incompatible with the
postinstall strategy of the parent package. If you need to install one
of those directly, you will need to move/run/link the included `vlt`
executable manually.

The bundled JS variant of the CLI still exists in the `infra/cli-js`
directory. It exists because it is still published for manual testing
and comparisons and it is an intermediary of the compiled CLI, so it
gets tested in `smoke-tests` to help debug the build pipeline of
`TS source` -> `esbuild bundled JS` -> `compiled Deno`.

## GUI Live Reload

When run locally the GUI can be set to use live reload so that any
changes to GUI source code will cause the browser to reload. To enable
this set `__VLT_INTERNAL_LIVE_RELOAD=1` when running the GUI:

```bash
__VLT_INTERNAL_LIVE_RELOAD=1 node ~/path/to/vltpkg/vltpkg/src/vlt/bins/vlt.ts gui
```

## Bundling Caveats

When publishing, all of the source code is first bundled and
code-split with esbuild.

There are some values in the source code that aren't statically
analyzed by esbuild, and instead are read from environment variables.
This is to make it explicit and because previous attempts to parse the
AST and detect those values were slow and brittle.

All the environment variables follow the pattern `__VLT_INTERNAL_*` in
order to distinguish them from the `VLT_*` environment variables that
are set by the CLI's config system.

## Testing Builds

Building for publishing is handled by the
[`infra/build`](./infra/build) workspace.

There are some root level scripts that can be run to generate these
builds for testing locally.

```bash
# creates a directory with all the bundled JS
pnpm build:bundle
# creates a directory with the compiled binaries
# for the current os and cpu
pnpm build:compile
```

To generate compiled builds for other platforms use the `--platform`
and `--arch` flags.

```bash
pnpm build:compile --platform=win32 --arch=x64
```

You can also run `pnpm pack` in any of the `./infra/cli-*` directories
to generate a tarball of the build.

## FAQ

### Test coverage is failing but it shouldn't be

If you are testing a file that has side effects when imported, such as
reading from `process.platform` to run different code, then this file
can't be imported with a static import and instead must use
`t.mockImport` for all instances.

Even though this code is valid and the tests will pass, coverage will
most likely fail depending on the implementation.

```ts
// ❌ dont do this
import { getEnvValue } from '../src/index.ts'

t.test('default', async t => {
  t.equal(getEnvValue(), 'DEFAULT_VALUE')
})

t.test('other case', async t => {
  t.intercept(process, 'env', { value: { MY_VALUE: 'MY_VALUE' } })
  const { getEnvValue } = await t.mockImport('../src/index.ts')
  t.equal(getEnvValue(), 'MY_VALUE')
})
```

Instead, all instances of the import must come from `t.mockImport`:

```ts
// ✅ Do this
t.test('default', async t => {
  const { getEnvValue } = await t.mockImport('../src/index.ts')
  t.equal(getEnvValue(), 'DEFAULT_VALUE')
})

t.test('other case', async t => {
  t.intercept(process, 'env', { value: { MY_VALUE: 'MY_VALUE' } })
  const { getEnvValue } = await t.mockImport('../src/index.ts')
  t.equal(getEnvValue(), 'MY_VALUE')
})
```
