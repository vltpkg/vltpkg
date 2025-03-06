![types](https://github.com/user-attachments/assets/67722b51-a70f-4779-be2e-405adeb55d06)

# @vltpkg/types

A module for a handful of core types that are used throughout vlt
extensively, and don't belong to any one particular implementation.

## Usage

```js
import {
  type Manifest,
  type Packument,
  type Integrity,
  type Signature,
  isManifest,
  isPackument,
  isIntegrity,
} from '@vltpkg/types'

const mani: Manifest = {
  name: 'hello',
  version: '1.2.3',
  dist: {
    tarball: 'https://example.com/hello-1.2.3.tgz',
    integrity: 'sha512-3yWxPTq3Uq/imagine/if/this/was/the/integrity/wow/it/could/happen/just/very/unlikely/00==',
  },
}
mani.dist.integrity
//        ^? Integrity | undefined
const someRandomObject = {
  name: 'foo',
  version: '1.2.3',
}
if (isManifest(someRandomObject)) {
  someRandomObject
  // ^? Manifest
}
```
