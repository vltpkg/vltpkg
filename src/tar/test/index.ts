import t from 'tap'
import * as unpack from '../src/unpack.ts'
import * as pool from '../src/pool.ts'
import * as unpackRequest from '../src/unpack-request.ts'
import * as index from '../src/index.ts'

t.strictSame(
  index,
  Object.assign(Object.create(null), {
    ...unpack,
    ...pool,
    ...unpackRequest,
  }),
)
