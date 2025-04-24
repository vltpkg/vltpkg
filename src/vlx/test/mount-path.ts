import t from 'tap'
import { posix } from 'node:path'
const { mountPath } = await t.mockImport<
  typeof import('../src/mount-path.ts')
>('../src/mount-path.ts', { path: posix })

t.equal(mountPath('/a/b/c', '../d/../e'), '/a/b/c/e')
t.equal(mountPath('/a/b/c', '/d'), '/a/b/c/d')
t.equal(mountPath('/a/b/c', '/a/b/c/d'), '/a/b/c/d')
