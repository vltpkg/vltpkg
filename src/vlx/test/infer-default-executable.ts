import t from 'tap'
import { inferDefaultExecutable } from '../src/infer-default-executable.ts'

t.strictSame(
  inferDefaultExecutable({
    name: 'xyz',
    bin: 'blah.js',
  }),
  ['xyz', 'blah.js'],
)

t.strictSame(
  inferDefaultExecutable({
    name: 'xyz',
    bin: { single: 'blah.js' },
  }),
  ['single', 'blah.js'],
)

t.strictSame(
  inferDefaultExecutable({
    name: 'xyz',
    bin: {
      asf: 'foo.bad',
      xyz: 'ok.js',
    },
  }),
  ['xyz', 'ok.js'],
)

t.strictSame(
  inferDefaultExecutable({
    name: '@scope/xyz',
    bin: {
      asf: 'foo.bad',
      '@scope': 'scope.bad',
      '@scope/xyz': 'also.bad',
      xyz: 'ok.js',
    },
  }),
  ['xyz', 'ok.js'],
)

t.strictSame(
  inferDefaultExecutable({
    bin: {
      asf: 'foo.bad',
      '@scope': 'scope.bad',
      '@scope/xyz': 'also.bad',
      xyz: 'ok.js',
    },
  }),
  undefined,
  'no name, cannot infer',
)

t.strictSame(
  inferDefaultExecutable({
    name: 'foo',
    bin: {
      asf: 'foo.bad',
      '@scope': 'scope.bad',
      '@scope/xyz': 'also.bad',
      xyz: 'ok.js',
    },
  }),
  undefined,
  'no match, cannot infer',
)

t.strictSame(
  inferDefaultExecutable({
    name: '@scope/foo',
    bin: {
      asf: 'foo.bad',
      '@scope': 'scope.bad',
      '@scope/xyz': 'also.bad',
      xyz: 'ok.js',
    },
  }),
  undefined,
  'no match, cannot infer',
)

t.strictSame(
  inferDefaultExecutable({
    name: 'xyz',
  }),
  undefined,
  'no bin, cannot infer',
)
