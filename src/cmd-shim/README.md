# @vltpkg/cmd-shim

This is a module for writing `.cmd` and `.ps1` shims for executables
on Windows, since shebangs are not supported on Windows, and thus
symlinks are not sufficient for running executables.

**[Usage](#usage)** · **[Note](#note)**

## Overview

This module doesn't do anything on non-Windows platforms.

On Windows platforms, it parses the `#!` (shebang) line of a script,
and figures out how to write the appropriate `.cmd` shim for it.

The behavior is just like creating a symlink, and it'll clobber
anything in its way.

It can also be used to determine which package a shim points to
(assuming it was created by vlt).

## Usage

```js
import { cmdShim, findSource } from '@vltpkg/cmd-shim'

const binFile = 'node_modules/some-pkg/bin/foo.js'
const target = 'node_modules/.bin/foo'

await cmdShim(binFile, target)
// now the file is there
assert(statSync(target).isFile())

// prints: 'node_modules/some-pkg'
console.error(await findSource(target))
```
