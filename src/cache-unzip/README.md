![cache-unzip](https://github.com/user-attachments/assets/edbe377f-d0ae-4d48-9658-3eb91d1bd482)

# @vltpkg/cache-unzip

This is a script that can be run as a detached background process to
un-gzip any cached response bodies in the vlt cache, and to explode
cached tarballs into the global store.

**[Usage](#usage)** · **[Global Store](#global-store)** ·
**[Why Do This?](#why-do-this)**

## Usage

Whenever you get a cache entry with a gzipped body, tell this module
about it.

```js
import { register } from '@vltpkg/cache-unzip'
import { Cache } from '@vltpkg/cache'

const cache = new Cache({ path: cachePath })

// later...

const response = get_response_cache_entry_somehow()
cache.set(myKey, response.encode())

// unzip it after this process is done
if (response.isGzip) {
  register(cachePath, myKey)
}
```

On process exit, these registered keys will be passed as arguments to
a detached deref'ed `vlt-cache-unzip` process. So, the main program
exits normally, but the child process ignores the `SIGHUP` and keeps
going until it's done. The next time that cache entry is read, it
won't have to be unzipped.

## Global Store

Pass the global store root as a third argument to `register()`, and
optionally the tarball's integrity, for entries that may only be
cached under it:

```js
register(cachePath, myKey, storeRoot, integrity)
```

When `VLT_STORE_LINKER` is `auto`, `hardlink` or `copy`, the child
also explodes each tarball entry with a sha512 `integrity` header into
`<storeRoot>/<integrity-hex>/`, with its sidecar index next to it at
`<integrity-hex>.json`. Unset or `unpack`: nothing is written there.

- Existing entries are skipped, unless their sidecar is missing or
  invalid: then they are redone. Bad tarballs are skipped too.
- Entries are built in `<storeRoot>/.tmp/` and renamed into place,
  sidecar first. If another process wins the rename, its entry is
  kept. Leftovers older than one hour are removed.
- `VLT_CACHE_UNZIP=0` skips the un-gzip rewrite.
- `VLT_CACHE_EXPLODE_CONCURRENCY` sets how many entries are read at
  once (default 1).
- `NODE_DEBUG=vlt` prints a summary: entries written, skipped (already
  there), ignored (missing or not a tarball), failed, bytes, ms.

With the global store on, the child runs at the lowest CPU priority.

## Why Do This

Because it's faster to not have to decompress the same content more
times than necessary.
