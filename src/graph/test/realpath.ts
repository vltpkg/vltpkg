import { resolve } from 'node:path'
import t from 'tap'
import { realpath } from '../src/realpath.js'

t.test('successfully returns the symlink target', async t => {
  const dir = t.testdir({
    a: 'a',
    b: t.fixture('symlink', 'a'),
  })
  t.strictSame(
    realpath(resolve(dir, 'b')),
    resolve(dir, 'a'),
    'should return realpaths',
  )
})

t.test('should read from cache if reading same path', async t => {
  const dir = t.testdir({
    a: 'a',
    b: t.fixture('symlink', 'a'),
  })
  realpath(resolve(dir, 'b'))
  t.strictSame(
    realpath(resolve(dir, 'b')),
    resolve(dir, 'a'),
    'should return realpath from cache',
  )
})
