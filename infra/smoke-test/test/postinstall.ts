import t from 'tap'
import type { Test } from 'tap'
import assert from 'node:assert'
import { cpSync, realpathSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, resolve, basename, sep } from 'node:path'
import Cli from '@vltpkg/cli-sdk/package.json' with { type: 'json' }
import type { VariantOptions } from '@vltpkg/infra-build'
import { whichSync } from '@vltpkg/which'
import { Bins, runVariant } from './fixtures/run.ts'

type Tarball = { path: string; name: string }
type Packed = { root: Tarball; tarballs: Tarball[] }

t.before(() => {
  const pnpm = realpathSync(whichSync('pnpm'))

  const proc = spawnSync(
    pnpm,
    [
      '--filter',
      '"./infra/cli-*"',
      '--filter',
      '"!./infra/cli-js"',
      'exec',
      pnpm,
      'pack',
    ],
    {
      cwd: resolve(import.meta.dirname, '../../..'),
      stdio: 'pipe',
      encoding: 'utf8',
      shell: true,
      windowsHide: true,
      env: {
        ...process.env,
        __VLT_INTERNAL_LOCAL_OPTIONAL_DEPS: '1',
        __VLT_INTERNAL_COMPILED_BINS: Bins.join(','),
      },
    },
  )

  assert(
    proc.status === 0,
    new Error(`Failed to pack tarballs`, { cause: proc }),
  )

  const { root, tarballs } = proc.stdout
    .split('\n')
    .filter(l => l.includes('.tgz'))
    .map(l => ({ path: l, name: basename(l) }))
    .reduce<{ root: Tarball | null; tarballs: Tarball[] }>(
      (acc, tarball) => {
        if (tarball.path.includes(`${sep}cli-compiled${sep}`)) {
          acc.root = tarball
        } else {
          acc.tarballs.push(tarball)
        }
        return acc
      },
      { root: null, tarballs: [] },
    )

  assert(root, new Error('root tarball not found', { cause: proc }))
  assert(
    tarballs.length,
    new Error('platform tarballs not found', { cause: proc }),
  )

  t.context.packed = { root, tarballs }
})

const installPacked = (
  t: Test,
  npmInstallArgs: string[] = [],
): VariantOptions => {
  const npm = realpathSync(whichSync('npm'))

  const { root, tarballs } = t.context.packed as Packed

  const testdir = t.testdir({
    'package.json': JSON.stringify({
      name: 'root-compile-dir-smoke-test',
      version: '0.0.0',
      private: true,
    }),
  })

  for (const tarball of [root, ...tarballs]) {
    cpSync(tarball.path, join(testdir, basename(tarball.name)))
  }

  const install = spawnSync(
    npm,
    ['install', `".${sep}${root.name}"`, ...npmInstallArgs],
    {
      cwd: testdir,
      stdio: 'pipe',
      encoding: 'utf8',
      shell: true,
      windowsHide: true,
    },
  )

  assert(
    install.status === 0,
    new Error(`Failed to install root tarball`, {
      cause: install,
    }),
  )

  return {
    args: bin => [bin],
    PATH: join(testdir, 'node_modules', '.bin'),
  }
}

// TODO(compile): turn back on once the compiled CLI is ready

t.skip('works by default', async t => {
  const v = installPacked(t)
  t.test('node_modules/.bin', async t => {
    const res = await runVariant(v, t, ['--version'], { shell: true })
    t.equal(res.status, 0)
    t.equal(res.stdout, Cli.version)
  })
})

t.skip('fails with --ignore-scripts', async t => {
  const v = installPacked(t, ['--ignore-scripts'])
  t.test('node_modules/.bin', async t => {
    const res = await runVariant(v, t, ['--version'], { shell: true })
    t.ok(typeof res.status === 'number' && res.status > 0)
  })
})
