import t from 'tap'
import { normalizeRegistryKey } from '../src/registry-key.ts'

t.test('keeps the path prefix, drops trailing slashes', t => {
  for (const url of [
    'https://r.io/luke/',
    'https://r.io/luke',
    'https://r.io/luke///',
  ]) {
    t.equal(normalizeRegistryKey(url), 'https://r.io/luke', url)
  }
  // a plain-origin registry keys on its origin alone
  t.equal(
    normalizeRegistryKey('https://registry.npmjs.org/'),
    'https://registry.npmjs.org',
  )
  // the port is part of the origin, the query and hash are not part of
  // either
  t.equal(
    normalizeRegistryKey('https://r.io:8080/luke/?x=1#y'),
    'https://r.io:8080/luke',
  )
  t.throws(() => normalizeRegistryKey('not a url'))
  t.end()
})
