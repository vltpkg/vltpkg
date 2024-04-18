# `@vltpkg/cache`

The filesystem cache for `@vlt/registry-client`, but also, a
general-purpose filesystem-backed
[LRUCache](http://npm.im/lru-cache).

## USAGE

```js
import { Cache } from '@vltpkg/cache'

const numberOfItemsToKeepInMemory = 10_000

const cache = new Cache({
  path: '/path/to/fs/cache/folder',
  // the number of items to keep in memory
  // on-disk folder will just keep everything
  // see @vltpkg/cache-manager for handling that
  max: 10_000,
})

// reading is always async, because it has to go to disk maybe
// this is a wrapper around an LRUCache#fetchMethod that reads
// from the file system
const someCachedValue = await cache.fetch(someKey)

// synchronous cache read, will only return a value if present in
// the memory cache. Does *not* fall back to the fs store.
const valueFromMemoryCache = cache.get(someKey)

// synchronous cache read, which does fall back to the fs store,
// using synchronous file I/O
const valueUsingSyncFileSystemOps = cache.fetchSync(someKey)

// set operations are atomically written to the fs cache in the
// background but are available immediately because they are
// added to the memory cache first
cache.set('some-key', 'some-value')
```

Note:

- The key type _must_ be a string or Buffer. It gets `sha-512`
  hashed to determine the file on disk, and that hash is used as
  the underlying key in the memory cache.
- The value must be either a string or Buffer, so that it can be
  written to a file.
