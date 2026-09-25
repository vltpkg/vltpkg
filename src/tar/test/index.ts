import t from 'tap'
import * as unpack from '../src/unpack.ts'
import * as linkTree from '../src/link-tree.ts'
import * as pool from '../src/pool.ts'
import * as storeEntry from '../src/store-entry.ts'
import * as storeIndex from '../src/store-index.ts'
import * as index from '../src/index.ts'

t.strictSame(
  index,
  Object.assign(Object.create(null), {
    unpack: unpack.unpack,
    unpackToStoreSync: unpack.unpackToStoreSync,
    ...linkTree,
    ...pool,
    ...storeEntry,
    readStoreIndex: storeIndex.readStoreIndex,
    storeIndexPath: storeIndex.storeIndexPath,
  }),
)
