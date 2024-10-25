<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/36e6a81d-ef77-4b39-a33c-b5878e1cf996" />
        <h1 align="center">
            <strong>@vltpkg/git</strong>
        </h1>
    </a>
</section>

<p align="center">
    A utility for spawning git from npm CLI contexts.
</p>

<p align="center">
    <a href="#usage"><strong>Usage</strong></a>
    ·
    <a href="#api"><strong>API</strong></a>
    ·
    <a href="#options"><strong>Options</strong></a>
</p>

## Overview

This is _not_ an implementation of git itself, it's just a thing that
spawns child processes to tell the system git CLI implementation to do
stuff.

Fork of `@npmcli/git`.

## Usage

```js
import { clone, spawn } from '@vltpkg/git'

// clone a repo
const sha = await clone(
  'git://foo/bar.git',
  'some-branch',
  'some-path',
  opts,
)
const result = await spawn(['checkout', 'some-branch'], {
  cwd: 'bar',
})
await spawn(['you get the idea'])
```

## API

Most methods take an options object. Options are described below.

### `spawn(args, opts = {})`

Launch a `git` subprocess with the arguments specified.

All the other functions call this one at some point.

Processes are launched using
[`@vltpkg/promise-spawn`](http://npm.im/@vltpkg/promise-spawn).

Return value is a `SpawnPromise` that resolves to a result object
with `{cmd, args, code, signal, stdout, stderr}` members, or
rejects with an error with the same fields, passed back from
[`@vltpkg/promise-spawn`](http://npm.im/@vltpkg/promise-spawn).

### `clone(repo, ref = 'HEAD', target = null, opts = {})` -> `Promise<sha string>`

Clone the repository into `target` path (or the default path for the name
of the repository), checking out `ref`.

Return value is the sha of the current HEAD in the locally cloned
repository.

In lieu of a specific `ref`, you may also pass in a `spec` option, which is
a [`npm-package-arg`](http://npm.im/npm-package-arg) object for a `git`
package dependency reference. In this way, you can select SemVer tags
within a range, or any git committish value. For example:

```js
import { Spec } from '@vltpkg/spec'
import { clone } from '@vltpkg/git'
clone('git@github.com:npm/git.git', '', null, {
  spec: Spec.parse('name@github:npm/git#semver:1.x'),
})
```

This will automatically do a shallow `--depth=1` clone on any hosts that
are known to support it. To force a shallow or deep clone, you can set the
`gitShallow` option to `true` or `false` respectively.

### `revs(repo, opts = {})` -> `Promise<rev doc Object>`

Fetch a representation of all of the named references in a given
repository. The resulting doc is intentionally somewhat
packument-like, so that git semver ranges can be applied using
the same
[`@vltpkg/pick-manifest`](http://npm.im/@vltpkg/pick-manifest)
logic.

The resulting object looks like:

```js
revs = {
  versions: {
    // all semver-looking tags go in here...
    // version: { sha, ref, rawRef, type }
    '1.0.0': {
      sha: '1bc5fba3353f8e1b56493b266bc459276ab23139',
      ref: 'v1.0.0',
      rawRef: 'refs/tags/v1.0.0',
      type: 'tag',
    },
  },
  'dist-tags': {
    HEAD: '1.0.0',
    latest: '1.0.0',
  },
  refs: {
    // all the advertised refs that can be cloned down remotely
    HEAD: { sha, ref, rawRef, type: 'head' },
    master: { ... },
    'v1.0.0': { ... },
    'refs/tags/v1.0.0': { ... },
  },
  shas: {
    // all named shas referenced above
    // sha: [list, of, refs]
    '6b2501f9183a1753027a9bf89a184b7d3d4602c7': [
      'HEAD',
      'master',
      'refs/heads/master',
    ],
    '1bc5fba3353f8e1b56493b266bc459276ab23139': [ 'v1.0.0', 'refs/tags/v1.0.0' ],
  },
}
```

### `is(opts)` -> `Promise<boolean>`

Resolve to `true` if the `cwd` option refers to the root of a git
repository.

It does this by looking for a file or folder at `${path}/.git`,
which is not an airtight indicator, but usually pretty reliable.

### `git.find(opts)` -> `Promise<string | undefined>`

Given a path, walk up the file system tree until a git repo
working directory is found. Since this calls `stat` a bunch of
times, it's probably best to only call it if you're reasonably
sure you're likely to be in a git project somewhere. Pass in
`opts.root` to stop checking at that directory.

Resolves to `undefined` if not in a git project.

### `isClean(opts = {})` -> `Promise<boolean>`

Return true if in a git dir, and that git dir is free of changes.
This will resolve `true` if the git working dir is clean, or
`false` if not, and reject if the path is not within a git
directory or some other error occurs.

## Options

- `retry` An object to configure retry behavior for transient network
  errors with exponential backoff.
  - `retries`: Defaults to `opts.fetchRetries` or 2
  - `factor`: Defaults to `opts.fetchRetryFactor` or 10
  - `maxTimeout`: Defaults to `opts.fetchRetryMaxtimeout` or 60000
  - `minTimeout`: Defaults to `opts.fetchRetryMintimeout` or 1000
- `git` Path to the `git` binary to use. Will look up the first `git` in
  the `PATH` if not specified.
- `spec` The [`@vltpkg/spec`](http://npm.im/@vltpkg/spec)
  specifier object for the thing being fetched (if relevant).
- `fakePlatform` set to a fake value of `process.platform` to use. (Just
  for testing `win32` behavior on Unix, and vice versa.)
- `cwd` The current working dir for the git command. Particularly for
  `find` and `is` and `isClean`, it's good to know that this defaults to
  `process.cwd()`, as one might expect.
- Any other options that can be passed to
  [`@vltpkg/promise-spawn`](http://npm.im/@vltpkg/promise-spawn), or
  `child_process.spawn()`.
