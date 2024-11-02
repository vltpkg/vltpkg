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
