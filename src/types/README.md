<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/c81fb214-e03f-407a-ad3c-47b1fa4078af" />
        <h1 align="center">
            <strong>@vltpkg/types</strong>
        </h1>
    </a>
</section>

<p align="center">
    A module for a handful of core types that are used throughout vlt extensively, and don't belong to any one particular implementation.
</p>

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
