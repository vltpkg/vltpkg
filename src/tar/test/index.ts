import t from 'tap'
import * as unpack from '../src/unpack.js'
import * as pool from '../src/pool.js'
import * as unpackRequest from '../src/unpack-request.js'
import * as index from '../src/index.js'

t.strictSame(
  index,
  Object.assign(Object.create(null), {
    ...unpack,
    ...pool,
    ...unpackRequest,
  }),
)
