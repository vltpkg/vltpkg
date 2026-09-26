import { readlinkSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { symlinkSyncMkdirp } from '../../src/reify/symlink-sync.ts'

const type = process.platform === 'win32' ? 'junction' : 'dir'

t.test('symlinkSyncMkdirp', async t => {
  const dir = t.testdir({ target: { 'x.txt': 'x' } })
  const target = resolve(dir, 'target')

  const link = resolve(dir, 'link')
  symlinkSyncMkdirp(target, link, type)
  statSync(resolve(link, 'x.txt'))

  const nested = resolve(dir, 'a', '@s', 'link')
  symlinkSyncMkdirp(target, nested, type)
  statSync(resolve(nested, 'x.txt'))
  t.equal(resolve(readlinkSync(nested)), target)

  t.throws(() => symlinkSyncMkdirp(target, link, type), {
    code: 'EEXIST',
  })
})
