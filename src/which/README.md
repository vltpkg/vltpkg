<section align="center">
    <a href="https://www.vlt.sh">
        <img src="https://github.com/user-attachments/assets/8f53fd72-9f87-4a2e-8f09-585a6f0e8d6a" />
        <h1 align="center">
            <strong>@vltpkg/which</strong>
        </h1>
    </a>
</section>

<p align="center">
    Like the unix `which` utility.
</p>

<p align="center">
    <a href="#usage"><strong>Usage</strong></a>
    ·
    <a href="#options"><strong>Options</strong></a>
</p>

## Overview

Finds the first instance of a specified executable in the PATH environment variable. Does not cache the results, so `hash -r` is not needed when the PATH changes.

Port of the [`which`](http://npm.im/which) to a TypeScript hybrid module.

## Usage

```js
import { which, whichSync } from '@vltpkg/which'

// async usage
// rejects if not found
const resolved = await which('node')

// if nothrow option is used, returns null if not found
const resolvedOrNull = await which('node', { nothrow: true })

// sync usage
// throws if not found
const resolved = whichSync('node')

// if nothrow option is used, returns null if not found
const resolvedOrNull = whichSync('node', { nothrow: true })

// Pass options to override the PATH and PATHEXT environment vars.
await which('node', { path: someOtherPath, pathExt: somePathExt })
```

## Options

You may pass an options object as the second argument.

- `path`: Use instead of the `PATH` environment variable.
- `pathExt`: Use instead of the `PATHEXT` environment variable.
- `all`: Return all matches, instead of just the first one. Note that
  this means the function returns an array of strings instead of a
  single string.
