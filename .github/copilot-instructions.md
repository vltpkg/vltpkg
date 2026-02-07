# vltpkg/vltpkg Monorepo Structure

The https://github.com/vltpkg/vltpkg repository is a monorepo, meaning
that it's organized in such a way that subfolders located in `src/*`,
`infra/*` and `www/*` are workspaces. Workspaces are individual
packages, sometimes these packages are published to a public registry
to be reused on their own like in the case of our monorepo the
workspaces located at `src/*` are published to the npm registry so
that they can be reused by different projects and the extended
community of vlt users.

You can read resources such as https://monorepo.tools/ to understand
more about monorepos and how to work with them.

## Workspaces

Following is a list of each workspace along with a brief description:

### Reusable internal packages from `src/*`

- src/cache, `@vltpkg/cache` - Cache system
- src/cache-unzip, `@vltpkg/cache-unzip` - Handles unzipping cache
  entries for optimization
- src/cli-sdk, `@vltpkg/cli-sdk` - Core CLI framework and entry point
- src/dss-parser, `@vltpkg/dss-parser` - The main Dependency Selector
  Syntax query language parser
- src/dss-breadcrumb, `@vltpkg/dss-breadcrumb` - A library to parse
  Dependency Selector Syntax queries into an object that can be used
  for interactive matching items
- src/dep-id, `@vltpkg/dep-id` - An unique id to represent each Node
  of our Graph data structure
- src/dot-prop, `@vltpkg/dot-prop` - Our fork of
  https://www.npmjs.com/package/dot-prop
- src/error-cause, `@vltpkg/error-cause` - Standardize error messages
  for our application
- src/fast-split, `@vltpkg/fast-split` - an optimized String.split()
  replacement
- src/git, `@vltpkg/git` - A utility for spawning git
- src/graph, `@vltpkg/graph` - The CLI main data structure, the Graph
  manages what packages are part of an install
- src/gui - An React, Zustand front-end application to visualize a
  Graph from `@vltpkg/graph`, distribution files can be find in its
  nested `dist/` folder
- src/init - `@vltpkg/init` - Implements the logic for the `vlt init`
  command
- src/keychain - `@vltpkg/keychain` - Implements a secure way to store
  authorizaton tokens to access registries
- src/output, `@vltpkg/output` - CLI output formatting
- src/package-info, `@vltpkg/package-info` - Retrieve package
  information
- src/package-json, `@vltpkg/package-json` - Helper module to read
  from and write to `package.json` files
- src/query/, `@vltpkg/query` - The query language implementation
- src/registry-client/, `@vltpkg/registry-client` - A fetch client to
  interact with remote registries
- src/run, `@vltpkg/run` - Command execution
- src/satisfies, `@vltpkg/satisfies` - How we compare DepID to see if
  it satisfies a given Spec
- src/security-archive, `@vltpkg/security-archive` - A custom cache
  for security data fetched from Socket.dev APIs
- src/semver, `@vltpkg/semver` - A library for parsing, validating &
  comparing Semantic Versions
- src/server, `@vltpkg/server` - The backend server to serve the
  src/gui frontend application & its required APIs
- src/spec, `@vltpkg/spec` - Parses package specifiers, this defines
  our Spec class which is heavily used in our Graph and adjancent
  libraries
- src/tar, `@vltpkg/tar` - A library for unpacking JavaScript package
  tarballs into a folder
- src/types, `@vltpkg/types` - Common types to the entire application
- src/url-open, `@vltpkg/url-open` - Helper to open a given URL in a
  OS default browser
- src/vlx, `@vltpkg/vlx` - Implements the logic for the `vlt exec`
  command
- src/workspaces, `@vltpkg/workspaces` - Loads and handles workspaces,
  a primary feature of JavaScript package managers
- src/xdg, `@vltpkg/xdg` - Manages common OS locations to store config
  files and other types of data

Every one of these components have unit tests implemented in a nested
`test/` folder, please consult these tests for better understand of
the API usage.

#### Package manager

The package manager currently managing this repository is `vlt` and as
you can see below it's being used to run common reusable scripts. The
`vlr` command is an alias for `vlt run`.

#### Running tests

To run tests for a given workspace, make sure you're in the
appropriate folder for the workspace you're currently working on, for
example to work on the `@vltpkg/semver` workspace navigate to the
`src/semver` folder and then run the command:

```bash
vlr test -Rtap
```

By using the `-Rtap` option you'll get TAP output which is a very
readable test output standard.

#### Updating Snapshots

When running tests, it may sometimes fail due to a `t.matchSnapshot`
assertion. That means some change to the current implementation broke
part of the expected API contract.

Please validate that the change of contract is intentional, if that's
not the case then changes to the implementation might be necessary but
in case the change is intentional it's then possible to automate the
updating of the snapshot assertions.

To update snapshots for a given workspace, make sure you're in the
appropriate folder for the workspace you're currently working on, for
example to work on the `@vltpkg/semver` workspace navigate to the
`src/semver` folder and then run the command:

```bash
vlr snap
```

#### Formatting code

You MUST run the formatter before completing your task. To format the
code for a given workspace, make sure you're in the appropriate folder
for the workspace you're currently working on, for example to format
code on the `@vltpkg/semver` workspace navigate to the `src/semver`
folder and then run the command:

```bash
vlr format
```

#### Linting code

You MUST run the linter before completing your task. To run the code
linter for a given workspace, make sure you're in the appropriate
folder for the workspace you're currently working on, for example to
lint code on the `@vltpkg/semver` workspace navigate to the
`src/semver` folder and then run the command:

```bash
vlr lint
```

#### Code coverage

It's essential that we maintain 100% of test coverage for each
workspace as that is a minimum threshold that the team has agreed to
work with. Note that tests will exit with an error code in case there
are missed lines of code or branches not fully covered by tests.

When finding code coverage issues, make sure to use the documented
workflow defined below.

If you're working on improving the current code coverage for a given
workspace, make sure you're in the appropriate folder for the
workspace you're currently working on, for example to get code
coverage on the `@vltpkg/semver` workspace navigate to the
`src/semver` folder and then run the command:

```bash
vlr test --coverage-report=text-lcov
```

That will provide lcov-compatible output for what lines of code,
functions and branches are currently missing coverage in the test
suite.

#### Type checking

To run the type checker for a given workspace, make sure you're in the
appropriate folder for the workspace you're currently working on, for
example to check types on the `@vltpkg/semver` workspace navigate to
the `src/semver` folder and then run the command:

```bash
vlr posttest
```

That will run the `tsc` type checker in the current workspace and
provide actionable output.

### Internal infrastructure and build workspaces

- infra/benchmarks - Benchmark scripts for this monorepo
- infra/build - Scripts for bundling/publishing the CLI in this
  monorepo
- infra/cli - The vlt CLI
- infra/smoke-test - Smoke tests for the CLI

### Documentation Website (docs.vlt.sh)

- www/docs - The source for documentation located at
  https://docs.vlt.sh
