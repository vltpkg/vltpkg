import t from 'tap'
import * as FSP from 'node:fs/promises'
import { type PathLike, type RmOptions } from 'node:fs'
const { rename: fsRename } = FSP

t.test('posix', async t => {
  t.intercept(process, 'platform', { value: 'posix' })
  const { rename } = await t.mockImport<
    typeof import('../src/rename.ts')
  >('../src/rename.ts')
  t.equal(rename, fsRename, 'use node rename on posix')
})

t.test('win32, retry works', async t => {
  t.intercept(process, 'platform', { value: 'win32' })
  let calledRm = false
  const { rename } = await t.mockImport<
    typeof import('../src/rename.ts')
  >('../src/rename.ts', {
    'node:fs/promises': t.createMock(FSP, {
      rm: async (target: PathLike, options?: RmOptions) => {
        calledRm = true
        return FSP.rm(target, options)
      },
      rename: async (oldPath: PathLike, newPath: PathLike) => {
        if (!calledRm)
          throw Object.assign(new Error('x'), { code: 'EPERM' })
        return FSP.rename(oldPath, newPath)
      },
    }),
  })
  t.not(rename, fsRename, 'use custom rename on windows')
  const dir = t.testdir({
    oldPath: {
      file: 'hello',
    },
    newPath: {
      otherFile: 'goodbye',
    },
  })

  await rename(`${dir}/oldPath`, `${dir}/newPath`)

  t.equal(calledRm, true)
})

t.test('win32, retry fails', async t => {
  t.intercept(process, 'platform', { value: 'win32' })
  let calledRm = 0
  const { rename } = await t.mockImport<
    typeof import('../src/rename.ts')
  >('../src/rename.ts', {
    'node:fs/promises': t.createMock(FSP, {
      rm: async (target: PathLike, options?: RmOptions) => {
        calledRm++
        return FSP.rm(target, options)
      },
      rename: async () => {
        throw Object.assign(new Error('x'), { code: 'EPERM' })
      },
    }),
  })
  t.not(rename, fsRename, 'use custom rename on windows')
  const dir = t.testdir({
    oldPath: {
      file: 'hello',
    },
    newPath: {
      otherFile: 'goodbye',
    },
  })

  await t.rejects(rename(`${dir}/oldPath`, `${dir}/newPath`), {
    code: 'EPERM',
  })

  t.equal(calledRm, 3, 'tried 3 times, then gave up')
})
