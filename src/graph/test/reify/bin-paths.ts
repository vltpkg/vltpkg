import t from 'tap'
import { binPaths } from '../../src/reify/bin-paths.ts'

t.strictSame(
  binPaths({
    name: 'unscoped',
    bin: 'blah.js',
  }),
  { unscoped: 'blah.js' },
)

t.strictSame(
  binPaths({
    name: '@scoped/pkg',
    bin: 'blah.js',
  }),
  { pkg: 'blah.js' },
)

t.strictSame(
  binPaths({
    name: 'unscoped',
    bin: { x: 'y.js' },
  }),
  { x: 'y.js' },
)

t.strictSame(binPaths({}), {})
