import t from 'tap'

import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { renameSync, rmSync, symlinkSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { cmdShim } from '../src/index.ts'
const {
  findCmdShim,
  findCmdShimIfExists,
  readCmdShim,
  readCmdShimIfExists,
} = await t.mockImport<typeof import('../src/read.ts')>(
  '../src/read.ts',
  {
    '../src/paths.ts': {
      paths: (path: string) => [
        path + '.cmd',
        path + '.ps1',
        path,
        path + '.pwsh',
      ],
    },
  },
)

const remover = { rm: async () => {} } as unknown as RollbackRemove

const __filename = fileURLToPath(import.meta.url)

const workDir = t.testdir({
  'test-shbang.js': '#!/usr/bin/env node\ntrue',
})

const testShbang = join(workDir, 'test-shbang')
const testShbangTarget = testShbang + '.js'
const testShbangCmd = testShbang + '.cmd'
const testShbangPowershell = testShbang + '.ps1'
const testShbangPwshOnly = testShbang + '-pwsh-only'
const testShbangPs1Only = testShbang + '-ps1-only'
const testShbangCmdOnly = testShbang + '-cmd-only'
const testShbangCygwinOnly = testShbang + '-cygwin-only'
const testShbangSymlinkOnly = testShbang + '-symlink-only'

const testShim = join(workDir, 'test')
const testShimCmd = testShim + '.cmd'
const testShimPowershell = testShim + '.ps1'

t.before(async () => {
  await cmdShim(__filename, testShim, remover)
  await cmdShim(testShbangTarget, testShbang, remover)

  await cmdShim(testShbangTarget, testShbangPwshOnly, remover)
  rmSync(testShbangPwshOnly, { force: true })
  rmSync(testShbangPwshOnly + '.cmd', { force: true })
  renameSync(
    testShbangPwshOnly + '.ps1',
    testShbangPwshOnly + '.pwsh',
  )

  await cmdShim(testShbangTarget, testShbangPs1Only, remover)
  rmSync(testShbangPs1Only, { force: true })
  rmSync(testShbangPs1Only + '.cmd', { force: true })

  await cmdShim(testShbangTarget, testShbangCmdOnly, remover)
  rmSync(testShbangCmdOnly, { force: true })
  rmSync(testShbangCmdOnly + '.ps1', { force: true })

  await cmdShim(testShbangTarget, testShbangCygwinOnly, remover)
  rmSync(testShbangCygwinOnly + '.cmd', { force: true })
  rmSync(testShbangCygwinOnly + '.ps1', { force: true })

  symlinkSync(testShbangTarget, testShbangSymlinkOnly)
})

t.test('read shims', async t => {
  t.equal(await readCmdShim(testShimCmd), __filename)
  t.equal(await readCmdShim(testShbangCmd), testShbangTarget)
  t.equal(await readCmdShim(testShim), __filename)
  t.equal(await readCmdShim(testShbang), testShbangTarget)
  t.equal(await readCmdShim(testShimPowershell), __filename)
  t.equal(await readCmdShim(testShbangSymlinkOnly), testShbangTarget)
  t.equal(
    await readCmdShimIfExists(testShbangPowershell),
    testShbangTarget,
  )

  // find if it's not already known which type of shim exists
  t.strictSame(await findCmdShim(testShbang), [
    testShbangCmd,
    testShbangTarget,
  ])
  t.strictSame(await findCmdShim(testShbangCmdOnly), [
    testShbangCmdOnly + '.cmd',
    testShbangTarget,
  ])
  t.strictSame(await findCmdShim(testShbangPwshOnly), [
    testShbangPwshOnly + '.pwsh',
    testShbangTarget,
  ])
  t.strictSame(await findCmdShim(testShbangPs1Only), [
    testShbangPs1Only + '.ps1',
    testShbangTarget,
  ])
  t.strictSame(await findCmdShim(testShbangCygwinOnly), [
    testShbangCygwinOnly,
    testShbangTarget,
  ])
  t.strictSame(await findCmdShim(testShbangSymlinkOnly), [
    testShbangSymlinkOnly,
    testShbangTarget,
  ])
})

t.test('errors', async t => {
  await t.rejects(readCmdShim(workDir), {
    cause: { cause: { code: 'EISDIR' } },
  })
  await t.rejects(readCmdShim('/path/to/nowhere'), {
    cause: { cause: { code: 'ENOENT' } },
  })
  await t.rejects(readCmdShim(__filename), {
    cause: { path: __filename },
  })
  await t.rejects(findCmdShim('/path/to/nowhere'), {
    cause: { path: '/path/to/nowhere' },
  })
  t.equal(await findCmdShimIfExists('/path/to/nowhere'), undefined)
  await t.rejects(readCmdShim('/path/to/nowhere'), {
    cause: { path: '/path/to/nowhere' },
  })
  t.equal(await readCmdShimIfExists('/path/to/nowhere'), undefined)
})
