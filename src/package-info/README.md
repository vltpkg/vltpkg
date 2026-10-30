![package-info](https://github.com/user-attachments/assets/51412725-7bb3-4126-92b9-a6ba0d1ec18a)

# @vltpkg/package-info

Get information about packages.

A spiritual descendant of [pacote](http://npm.im/pacote).

## Usage

```js
import {
  manifest,
  tarball,
  packument,
  resolve,
} from '@vltpkg/packge-info'

// get the full packument for the named package

// note that the '@2' part of the spec is irrelevant here,

// if it's a semver range.

console.log(await packument('bar@2'))

// get the manifest for a single version, resolving it.

console.log(await manifest('foo@latest'))

// get the tarball as a Buffer

const tarballBuffer = await tarball('foo@1.x')

// just figure out what it resolves to

const { resolved, integrity } = await resolve('bar@latest')
```

## Global store

With the `store-linker` option set to `auto`, `hardlink`, `clone` or
`copy`, `extract()` places a registry package from its global store
entry (`<storeRoot>/<integrity hex>`, `storeRoot` defaults to
`<cache>/store/v1`) when there is one. On a miss it unpacks the cached
tarball as usual and queues it for the background child, so the next
install finds it in the global store. Missing or unknown
`store-linker` means `unpack`. The vlt CLI defaults to `auto`, which
it resolves to `clone` on macOS with a Node that can load `node:ffi`
and to `unpack` on other platforms than Linux, so `extract()` only
ever sees `auto` from the CLI on Linux. A gzipped cached tarball that
is not store-linked (`unpack`, git or remote tarballs, no sha512
integrity) is queued too, so the child un-gzips it.

Packages with install scripts are linked too; reify copies them in
place right before their scripts run. A clone is copy-on-write, so
with `clone` they are cloned like any other package, and reify finds
nothing to copy.

A store link logs its request as `store`, a copy from the store as
`cache`. Both also return `manifest` (the package.json as JSON text,
if the index has it) and `bindingGyp`, so reify need not read them
back from disk. With `NODE_DEBUG=vlt`, linked / copied / missed counts
and the store hit rate are printed at exit.

## Manifest workers

Against a registry that serves full packuments, resolving a manifest
is mostly main-thread CPU: a cold install of a mid-sized project
parses about 100MB of packument JSON, which measured 3.5s of a 5.5s
graph build on two cores, during which no response is read and no node
is placed. `manifest()` therefore hands plain registry lookups to a
`ManifestPool` (`src/manifest-pool.ts`, `src/manifest-worker.ts`):
worker threads that each run their own `PackageInfoClient` over the
same disk caches. A worker fetches, inflates, parses and picks, and
posts back only the manifest. Specs route to a worker by the hash of
their name, so a packument is fetched once, and jobs queue while a
worker boots.

The main client still answers first from the resolve stream and the
manifest disk cache, keeps racing a server-side resolve stream the way
it did, and resolves on its own thread anything a worker cannot answer
(a lookup with selection options, a `full` packument, a worker that
died), so every error reported is the usual one.

- `VLT_MANIFEST_THREADS=<n>`: worker count; `0` resolves everything on
  the main thread. Default: three, or one per core less the main
  thread's when there are fewer.
