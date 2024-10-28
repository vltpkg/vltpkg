![tar](https://github.com/user-attachments/assets/a01d2d1e-1815-4888-bb2e-67094af74de0)

# @vltpkg/tar

A library for unpacking JavaScript package tarballs (gzip-compressed or raw) into a specified folder.

**[Usage](#usage)**
·
**[Caveats](#caveats)**

## Overview

If you are unpacking anything other than npm packages, in precisely the way that [vlt](https://vlt.sh) does, then this is
probably not what you're looking for.

For a very complete and battle-tested generic tar implementation in JavaScript, see [node-tar](http://npm.im/tar).

## Usage

### unpack(tarData, targetFolder)

Pass your gzip-compressed or raw uncompressed JavaScript package
tarball in a Buffer (or Uint8Array, or ArrayBuffer slice) into
the function, along with the folder you want to drop it in.

It will unpack as fast as possible, using synchronous I/O.

```js
import { unpack } from '@vltpkg/tar'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const gzipped = readFileSync('my-package.tgz')
const unzipped = gunzipSync(gzipped)

unpack(unzipped, 'node_modules/target')
```

### `class Pool`

Create a pool of worker threads which will service unpack
requests in parallel.

New requests that get added will be assigned to workers as those
workers become available. When a worker completes its task, and
there are no more tasks to assign, it is terminated. If not
enough workers are available to service requests, then new ones
will be spawned.

#### `pool.jobs`

The number of worker threads that will be created.

#### `pool.workers`

Set of currently active worker threads.

#### `pool.queue`

Queue of requests awaiting an available worker.

#### `pool.pending`

Unpack requests that have been assigned to a worker, but not yet
completed.

#### `pool.unpack(tarData: Buffer, target: string) => Promise<void>`

Unpack the supplied Buffer of data into the target folder,
using synchronous I/O in a worker thread.

Promise resolves when this unpack request has been completed.

## Caveats

As stated above, **this is not a general purpose tar
implementation**. It does not handle symbolic links at all (those
aren't allowed in JavaScript packages). It does not respect
uid/gid ownership flags. All files are with a mode of `0o644` (or
`0o666` on Windows - technically it's `0o666` xor'ed with the
system umask, so that'll often be `0o664` on linux systems). All
directories are created with a mode of `0o755` by default (with
the same windows/umask caveats as files, so maybe that's `0o775`
or some such.) All ctime/mtime/atime/birthtime values will just
be left as the current time.

It does not do any of the binary linking or other stuff that a
package manager will need to do. It _just_ does the unpack, as
ruthlessly fast as possible, and that's all.

Synchronous IO is used because that's faster and requires less
CPU utilization. The `Pool` class manages multiple worker threads
doing this work, so faster sync IO for the whole thing is much
more optimal.
