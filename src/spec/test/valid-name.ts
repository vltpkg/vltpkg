import t from 'tap'
import {
  assertPathSafeName,
  isPathSafeName,
} from '../src/valid-name.ts'

t.test('rejects names that are not a single path segment', t => {
  const bad = [
    '',
    '.',
    '..',
    '@../x',
    '@./x',
    '@a/..',
    '@a/.',
    '@a/b/c',
    '@/x',
    '/abs',
    '\\unc',
    'C:forbidden',
    'Z:',
    'c:/x',
    'a\\b',
    '../x',
    'x/../y',
    'x/y',
    'node_modules',
    'NODE_MODULES',
    '.vlt',
    '.VLT',
    'foo\u0000bar',
    'foo\nbar',
    'foo\u007fbar',
    './x',
  ]
  for (const name of bad) {
    t.equal(isPathSafeName(name), false, JSON.stringify(name))
    t.throws(
      () => assertPathSafeName(name, 'x@1.2.3'),
      {
        message: 'Invalid package name: not usable as a path segment',
        cause: { code: 'EINVALIDNAME', found: name, from: 'x@1.2.3' },
      },
      JSON.stringify(name),
    )
  }
  t.end()
})

t.test('rejects non-strings', t => {
  for (const name of [undefined, null, 1, {}, ['x']]) {
    t.equal(isPathSafeName(name), false, JSON.stringify(name))
  }
  t.throws(() => assertPathSafeName(undefined))
  t.end()
})

t.test('allows legacy-ugly but harmless names', t => {
  const good = [
    'foo',
    // a lone '@' is a legal dir name, not an escape
    '@',
    '@scope/foo',
    '@scope/node_modules',
    '@node_modules/foo',
    '_leading',
    'UPPER',
    'with space',
    'ünicode',
    '~tilde',
    '..foo',
    'foo..',
    '%2e%2e',
    'favicon.ico',
    'node_modules.js',
  ]
  for (const name of good) {
    t.equal(isPathSafeName(name), true, name)
    t.doesNotThrow(() => assertPathSafeName(name, 'from'), name)
  }
  t.end()
})
