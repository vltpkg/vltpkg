import t from 'tap'
import { normalizeBin } from '../src/normalize-bin.ts'

t.strictSame(
  normalizeBin({
    name: 'unscoped',
    bin: 'blah.js',
  }).bin,
  { unscoped: 'blah.js' },
)

t.strictSame(
  normalizeBin({
    name: '@scoped/pkg',
    bin: 'blah.js',
  }).bin,
  { pkg: 'blah.js' },
)

t.strictSame(
  normalizeBin({
    name: 'unscoped',
    bin: { x: 'y.js' },
  }).bin,
  { x: 'y.js' },
)

//@ts-expect-error - not allowed on Manifest type
t.strictSame(normalizeBin({ bin: null }).bin, undefined)

t.strictSame(normalizeBin({}).bin, undefined)
