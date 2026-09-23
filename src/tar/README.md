![tar](https://github.com/user-attachments/assets/a01d2d1e-1815-4888-bb2e-67094af74de0)

# @vltpkg/tar

A library for unpacking JavaScript package tarballs (gzip-compressed
or raw) into a specified folder.

**[Usage](#usage)** · **[Global store](#global-store)** ·
**[Caveats](#caveats)**

## Overview

If you are unpacking anything other than npm packages, in precisely
the way that [vlt](https://vlt.sh) does, then this is probably not
what you're looking for.

For a very complete and battle-tested generic tar implementation in
JavaScript, see [node-tar](http://npm.im/tar).

## Usage

### unpack(tarData, targetFolder)

Pass your gzip-compressed or raw uncompressed JavaScript package
tarball in a Buffer (or Uint8Array, or ArrayBuffer slice) into the
function, along with the folder you want to drop it in.

It will unpack as fast as possible.

```js
import { unpack } from '@vltpkg/tar'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const gzipped = readFileSync('my-package.tgz')
const unzipped = gunzipSync(gzipped)

unpack(unzipped, 'node_modules/target')
```

### unpackSync(tarData, targetFolder)

Same as `unpack`, but blocking. Faster: the async writers pay a libuv
round trip per file, which costs more than the IO itself.

### unpackFileSync(file, targetFolder, offset = 0)

Read the tarball from a file on disk, skipping `offset` leading bytes,
and unpack it synchronously. The offset lets a tarball be extracted
straight out of a cache entry whose file starts with a header block.

### `class Pool`

The interface the vlt CLI extracts through. All methods are `async`
for the caller's convenience; the work itself is synchronous and runs
on the main thread.

The pool holds no queue and imposes no limit -- callers are expected
to cap their own concurrency. (`@vltpkg/graph`'s reify does.)

#### `pool.unpack(tarData: Buffer, target: string) => Promise<void>`

Unpack the supplied Buffer of data into the target folder.

#### `pool.unpackFile(file: string, target: string, offset = 0) => Promise<void>`

Unpack a tarball read from `file`, skipping `offset` leading bytes.

#### `pool.linkFromStore(storeEntry, target, opts?) => Promise<boolean>`

#### `pool.unpackToStore(tarData, dir) => Promise<{ index }>`

See [Global store](#global-store).

## Global store

A global store entry is a tarball exploded once into a directory, with
a sidecar index at `<entry>.json` (`StoreIndex`). Packages are then
materialized by hardlinking files instead of unpacking the tarball
again. Publishing entries atomically (sidecar, then rename the dir
into place) is up to the caller.

The vlt CLI keeps its global store under `<cache>/store/v1`, filled by
a background process, and installs from it with the `store-linker`
config (`auto` by default, `hardlink`, `copy`; `unpack` skips it).

### unpackToStoreSync(tarData, dir)

Explode a gzipped or raw tarball into `dir` (must not exist) and
return `{ index }`. Same parsing, path safety and modes as
`unpackSync`; package.json `bin` targets also get every exec bit, so
nothing has to chmod them later. Throws, writing nothing, without a
valid package.json.

The index has files (`[path, size, exec]`, sorted), every directory
(shortest first), `scripts` (install scripts or a root `binding.gyp`),
normalized `bins`, `name` and `version`.

### linkFromStore(storeEntry, target, { copy })

Hardlink every file of a store entry into a sibling temp dir
(package.json last), then rename it to `target`. Returns `false`,
creating nothing, if the sidecar is missing or invalid, the entry is
not a directory, or the target's parent is a symlink. An entry with a
missing file is removed and `false` returned. Two index paths that
collide on a case-insensitive target (`EEXIST`) also return `false`.

`EXDEV`, `EPERM`, `EACCES` and `ENOTSUP` switch the process to copying
(read + write into a fresh file); `ENOENT` while both the source and
the target's parent exist (overlayfs cross-layer links) does the same.
`EMLINK` copies that file only. Other link errors throw. Every file is
copied with `copy: true` or when the index has `scripts`, so install
scripts never write into the store.

`VLT_STORE_VERIFY=1` checks the linked package.json size against the
index and removes the entry on a mismatch (debugging aid).

### readStoreIndex(storeEntry)

The sidecar index, or `undefined` if missing or invalid.

### storeIndexPath(storeEntry)

Sidecar path: `<storeEntry>.json`.

### Maintenance

- `storeEntryNames(root)`: integrity hex names of the entries under a
  store root (entry dir, sidecar or both).
- `verifyStoreEntry(storeEntry, tarData)`: compare an entry with its
  tarball (sidecar, file list, bytes). Returns why it differs, or
  `undefined`.
- `storeEntryLinked(storeEntry)`: true if any file has another
  hardlink, i.e. some `node_modules` uses it.
- `storeEntryTime(storeEntry)`: sidecar mtime in ms (dir mtime without
  one, else 0).
- `removeStoreEntry(storeEntry)`: remove the dir, then the sidecar.

## Caveats

As stated above, **this is not a general purpose tar implementation**.
It does not handle symbolic links at all (those aren't allowed in
JavaScript packages). It does not respect uid/gid ownership flags. All
files are with a mode of `0o644` (or `0o666` on Windows - technically
it's `0o666` xor'ed with the system umask, so that'll often be `0o664`
on linux systems). All directories are created with a mode of `0o755`
by default (with the same windows/umask caveats as files, so maybe
that's `0o775` or some such.) All ctime/mtime/atime/birthtime values
will just be left as the current time.

Gzip-compressed tarballs are inflated with a size bound before any tar
structure checks run. The cap is the smaller of 2 GiB and 1000 times
the compressed size (the same 1000:1 ratio node-tar and npm use).
Exceeding it fails with `tarball exceeds maximum unpacked size` rather
than allocating the decompressed buffer. Raise the ceiling with
`VLT_TAR_MAX_UNPACKED_BYTES` if a legitimate package is larger than 2
GiB unpacked.

It does not do any of the binary linking or other stuff that a package
manager will need to do. It _just_ does the unpack, as ruthlessly fast
as possible, and that's all.

Synchronous IO is used because it is faster and costs less CPU than
the async writers, which pay a libuv round trip per file. The cost is
that extraction blocks the event loop while it runs. Set
`VLT_TAR_SYNC=0` to make `Pool` use the async writers instead -- a
kill switch, not a supported mode.
