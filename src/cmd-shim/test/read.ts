import t from 'tap'

import { RollbackRemove } from '@vltpkg/rollback-remove'
import { renameSync, rmSync, symlinkSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { cmdShim } from '../src/index.ts'
import {
  findCmdShim,
  readCmdShim,
  readCmdShimIfExists,
} from '../src/read.ts'

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
  t.equal(
    await readCmdShimIfExists(testShbangPowershell),
    testShbangTarget,
  )

  // find if it's not already known which type of shim exists
  t.equal(await findCmdShim(testShbangCmd), testShbangTarget)
  t.equal(await findCmdShim(testShbangCmdOnly), testShbangTarget)
  t.equal(await findCmdShim(testShbangPwshOnly), testShbangTarget)
  t.equal(await findCmdShim(testShbangPs1Only), testShbangTarget)
  t.equal(await findCmdShim(testShbangCygwinOnly), testShbangTarget)
  t.equal(await findCmdShim(testShbangSymlinkOnly), testShbangTarget)
})

t.test('errors', async t => {
  await t.rejects(readCmdShim(workDir), {
    cause: { cause: { code: 'EISDIR' } },
  })
  t.rejects(readCmdShim('/path/to/nowhere'), {
    cause: { cause: { code: 'ENOENT' } },
  })
  t.rejects(readCmdShim(__filename), { cause: { path: __filename } })
  t.rejects(findCmdShim('/path/to/nowhere'), {
    cause: { path: '/path/to/nowhere' },
  })
  t.equal(await readCmdShimIfExists('/path/to/nowhere'), undefined)
})
