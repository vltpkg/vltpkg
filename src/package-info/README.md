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

With the `store-linker` option set to `auto`, `hardlink` or `copy`,
`extract()` places a registry package from its global store entry
(`<storeRoot>/<integrity hex>`, `storeRoot` defaults to
`<cache>/store/v1`) when there is one. On a miss it unpacks the cached
tarball as usual and queues it for the background child, so the next
install finds it in the global store. Missing or unknown
`store-linker` means `unpack` (the vlt CLI defaults to `auto`).

Packages with install scripts are copied, never linked: when the store
index says so, or with the `installScripts` extract option.

A store link logs its request as `store`, a copy from the store as
`cache`. Both also return `manifest` (the package.json as JSON text,
if the index has it) and `bindingGyp`, so reify need not read them
back from disk. With `NODE_DEBUG=vlt`, linked / copied / missed counts
and the store hit rate are printed at exit.
