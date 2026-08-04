# Contributing Guide

## Getting Started

Development requires Git, Node.js 22.22.x, and the latest released
`vlt` CLI. If you use [`nvm`](https://github.com/nvm-sh/nvm), the
repository's `.nvmrc` selects the supported Node.js major.

```bash
# Clone the repository
git clone https://github.com/vltpkg/vltpkg.git
cd vltpkg

# Install and select the Node.js version from .nvmrc
nvm install
nvm use

# Install the released CLI used to bootstrap the repository
curl -fsSL https://install.vlt.sh | bash

# Install dependencies and prepare generated workspace files
vlt install
vlr --recursive prepare

# Run the CLI directly from source
./scripts/bins/vlt --version
```

You do not need to run `vlt setup` to work on this repository. That
command configures registry aliases and authentication for a vlt.io
account. The checked-in [`vlt.json`](./vlt.json) already points this
project at the public registry used to install its dependencies.

## Workspace Structure

The workspaces are divided among a few top-level directories.

Be sure to check out the `CONTRIBUTING.md` file in the workspace where
changes are being made, as this may provide contribution guidance
specific to that component.

### [`src`](./src/)

These workspaces are direct dependencies of the `vlt` CLI.

The CLI framework is also a workspace in
[`src/cli-sdk`](./src/cli-sdk/).

Most of these are also published separately under the `@vltpkg` scope.

### [`infra`](./infra/)

These workspaces contain tools for building, bundling, and
benchmarking the other workspaces. They also contain the publishable
CLI distributions in [`infra/cli`](./infra/cli/) and
[`infra/cli-js`](./infra/cli-js/).

### [`www`](./www/)

These are websites that get deployed. Currently only
[docs.vlt.sh](https://docs.vlt.sh).

## Linting / Formatting

Run `vlr fix` to report any formatting or linting issues with your
code, and to attempt to fix them.

## Running TypeScript Directly

This repository uses Node.js 22.22.x, where type stripping is enabled
by default. TypeScript files that use erasable syntax can be run
directly:

```bash
node ./path/to/file.ts
```

Node's built-in type stripping does not type-check files or support
TypeScript syntax that requires transformation. The launchers in
`./scripts/bins` set the repository's required `NODE_OPTIONS`
automatically, so no global environment configuration is needed for
normal development.

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

If you use [`nvm`](https://github.com/nvm-sh/nvm), run `nvm install`
and `nvm use` to install and select the version defined in the root
`.nvmrc` file. Notably, there are
[known issues](https://nodejs.org/en/blog/vulnerability/december-2025-security-releases#downloads-and-release-details)
in `node` versions `<22.22` and unknown compatibility for `>=23`. If
you are using a version outside of the known-good range set you are
likely to experience errors when developing and should install an
in-range version.

## Using `setup-node` in CI

Our CI uses the `setup-node` action and is explicitly configured to
use the latest known-good version of Node.js (`^22.22.0`). You can
find this configuration in `.github/workflows/*.yml`.

## Root Level Scripts

This root of this repo has scripts for each named bin that can be run
via `vlt` for testing locally.

These scripts set the correct `NODE_OPTIONS` to run the TypeScript
source directly.

```bash
$ node --run vlt -- --version
0.0.0-0
```

## Running the CLI from Other Directories

A directory of `sh` and `ps1` executables is located at
`./scripts/bins`. These call the TypeScript source bin files with the
correct `NODE_OPTIONS`. This directory is designed to be put at the
beginning of your path temporarily to make running of `vlt` and its
related CLIs run directly from source.

```bash
export PATH=~/projects/vltpkg/vltpkg/scripts/bins:$PATH
vlt --version
```

There is also a `./scripts/bins/bundle` directory that can be used the
same way to run the `esbuild` bundled JavaScript variant with `node`.

## Publishing

All workspace directories are designed so `vlt publish` can be run
from that directory.

On all pushes to `main` a GitHub Actions workflow will run to create a
release PR. That PR will be updated for all subsequent pushes. The PR
will contain any release related commits, usually just the bumping of
`package.json` version numbers.

When that PR is merged the same workflow will then publish the bumped
packages.

By default, the workflow increments the current prerelease version. To
set an exact version for the next release, add a `.release-version`
file at the repository root containing a valid semver without a
leading `v`. It must be greater than the current version:

```text
1.0.0
```

Merge that file through a normal PR. The workflow will use the exact
version for all released packages, then delete `.release-version` in
the generated release PR so the override only applies once.

### Release Manager

The weekly release manager's role is to merge the release PR. Pretty
simple :smile:

The release PR will be created as a `draft`. When it is time to
release, merging other PRs should be temporarily paused and the
release PR should be:

1. Marked as ready for review
1. Approved
1. Merged (Make sure to use "Rebase and merge")

#### Release PR

The release PR will run additional checks not run on normal PRs. Those
include:

- Running all workspace tests
- Running workspace tests in additional environments
- Running the smoke-tests

If these status checks fail unexpectedly, it could be because its
flaky or its a real bug. You should check the workflow logs to
determine which case it is.

**View the latest release run**

```sh
gh run view $(gh run list -w "ci.yml" -b release -L 1 --json databaseId -q ".[].databaseId") -w
```

**Rerun the failed jobs**

```sh
gh run rerun $(gh run list -w "ci.yml" -b release -L 1 --json databaseId -q ".[].databaseId") --failed
```

#### Publish Workflow

Once the release PR is merged, a publish will be triggered from CI. If
this workflow fails (due to network, auth, etc issues) it can be
safely rerun. It will only attempt to publish workspaces which have
not had their current version published.

**Rerun the publish job**

```sh
gh workflow run release.yml --ref=main -f action=publish
```

### Published CLI Packages

- `vlt` The main CLI package, published as bundled JavaScript.
- `@vltpkg/cli-js` The bundled JS variant, also published for manual
  testing and debugging.

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
vlr build:bundle
```

You can also run `vlt pack` in `./infra/cli` or `./infra/cli-js` to
generate a tarball of the build.

## Finding Unused Code and Deps with Knip

`knip` is installed and configured in the root of the monorepo and can
be run with:

```sh
vlr knip
```

It is not currently turned on in CI but can be helpful to run locally
after a refactor or moving/creating/deleting workspaces.

False positives can be ignored in the `knip.ts` config file.

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
