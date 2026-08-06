import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { symlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { ensureStoreDirs } from '../../src/reify/ensure-store-dirs.ts'

const removed: string[] = []
const remover = {
  rm: async (path: string) => {
    removed.push(path)
  },
} as unknown as RollbackRemove

t.test('leaves real directories alone', async t => {
  const dir = t.testdir({ node_modules: { '.vlt': {} } })
  await ensureStoreDirs(new PathScurry(dir), remover)
  t.strictSame(removed, [])
})

t.test('removes a symlinked store', async t => {
  const dir = t.testdir({ elsewhere: {} })
  symlinkSync(resolve(dir, 'elsewhere'), resolve(dir, 'node_modules'))
  const scurry = new PathScurry(dir)
  await ensureStoreDirs(scurry, remover)
  t.strictSame(removed, [scurry.resolve('node_modules')])

  removed.length = 0
  await ensureStoreDirs(scurry, remover)
  t.strictSame(removed, [], 'memoized, one syscall per dir')
})
