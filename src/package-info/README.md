# `@vltpkg/package-info`

Get information about packages.

Spiritual descendant of [pacote](http://npm.im/pacote).

## USAGE

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
