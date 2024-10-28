![cache](https://github.com/user-attachments/assets/beb8e72b-9af4-42ff-a39c-11c937bffdb6)

# @vltpkg/cache

The filesystem cache for `@vlt/registry-client`, but also, a general-purpose filesystem-backed [LRUCache](http://npm.im/lru-cache)

**[Usage](#usage)**
·
**[Note](#note)**

## Overview

This is very minimal on features, because it has a very narrow use case, but if you want to have a persistently fs-backed LRU
memory cache of Buffers using strings as keys, then this is the
thing to use.

## Usage

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

// fetch by integrity, if available:
const integrity =
  'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
const valueByInt = await cache.fetch('blah', {
  context: { integrity },
})

// synchronous cache read, will only return a value if present in
// the memory cache. Does *not* fall back to the fs store.
const valueFromMemoryCache = cache.get(someKey)

// synchronous cache read, which does fall back to the fs store,
// using synchronous file I/O
const valueUsingSyncFileSystemOps = cache.fetchSync(someKey)

// set operations are atomically written to the fs cache in the
// background but are available immediately because they are
// added to the memory cache first
cache.set('some-key', Buffer.from('some-value'))

// set with integrity creates a hard-linked file at the content
// address, so that anyone fetching the same content by any other
// key will get the same result.
cache.set(someKey, someValue, { integrity })
await cache.promise() // once it's done writing...
// returns identical bits as someValue, because on-disk cache
// hard links to a file based on the integrity value.
const otherValue = await cache.fetch(otherKey, {
  context: { integrity },
})
```

## Note

- The key type must be a string. It gets sha512 hashed to determine the file on disk.
- The value must be a Buffer, so that it can be written to a file and read from it without having to convert anything.
