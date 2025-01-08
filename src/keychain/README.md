# @vltpkg/keychain

The filesystem keychain for `@vltpkg/registry-client`

**[Usage](#usage)**

## Overview

This is a tool to store and retrieve private keys for use in the
`@vltpkg/registry-client`.

## Usage

```js
import { Keychain } from '@vltpkg/keychain'

// define a keychain with a given application scope
const kc = new Keychain('vlt/auth')

// fetch the auth for a given origin, for example.
// will load file on demand when first get() called.
const auth = await kc.get('https://registry.npmjs.org')

// set a value like this
kc.set('https://some-registry.com', 'Bearer newtoken')

// will attempt to save on process end if there are pending
// writes, but only if the file has not been modified since.
// you can also trigger a write explicitly.
await kc.save()
```
