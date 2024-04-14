import t from 'tap'
import * as unpack from '../dist/esm/unpack.js'
import * as pool from '../dist/esm/pool.js'
import * as unpackRequest from '../dist/esm/unpack-request.js'
import * as index from '../dist/esm/index.js'

t.strictSame(index, Object.assign(Object.create(null), {
  ...unpack,
  ...pool,
  ...unpackRequest
}))
