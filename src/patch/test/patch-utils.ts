import t from 'tap'
import { getPatchFilename } from '../src/patch-utils.ts'

t.test('getPatchFilename', async t => {
  t.test('simple package name', async t => {
    const filename = getPatchFilename('express', '4.18.0')
    t.equal(filename, 'express+4.18.0.patch')
  })

  t.test('scoped package name', async t => {
    const filename = getPatchFilename('@types/node', '18.0.0')
    t.equal(filename, '@types+node+18.0.0.patch')
  })

  t.test('package with slashes', async t => {
    const filename = getPatchFilename('@org/package', '1.0.0')
    t.equal(filename, '@org+package+1.0.0.patch')
  })
})
