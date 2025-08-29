import t from 'tap'
import type { Test } from 'tap'
import assert from 'node:assert'
import { cpSync, realpathSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import {
  join,
  resolve,
  basename,
  sep,
  dirname,
  delimiter,
} from 'node:path'
import Cli from '@vltpkg/cli-sdk/package.json' with { type: 'json' }
import type { VariantOptions } from '@vltpkg/infra-build'
import { whichSync } from '@vltpkg/which'
import { Bins, runVariant } from './fixtures/run.ts'

type Tarball = { path: string; name: string }
type Packed = { root: Tarball; compiled: Tarball[]; js: Tarball }

t.before(() => {
  const pnpm = realpathSync(whichSync('pnpm'))

  const proc = spawnSync(
    pnpm,
    ['--filter', '"./infra/cli-*"', 'exec', pnpm, 'pack'],
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

  const { root, compiled, js } = proc.stdout
    .split('\n')
    .filter(l => l.includes('.tgz'))
    .map(l => ({ path: l, name: basename(l) }))
    .reduce<{
      root: Tarball | null
      js: Tarball | null
      compiled: Tarball[]
    }>(
      (acc, tarball) => {
        if (tarball.path.includes(`${sep}cli-compiled${sep}`)) {
          acc.root = tarball
        } else if (tarball.path.includes(`${sep}cli-js${sep}`)) {
          acc.js = tarball
        } else {
          acc.compiled.push(tarball)
        }
        return acc
      },
      { root: null, compiled: [], js: null },
    )

  assert(root, new Error('root tarball not found', { cause: proc }))
  assert(js, new Error('js tarball not found', { cause: proc }))
  assert(
    compiled.length,
    new Error('platform tarballs not found', { cause: proc }),
  )

  t.context.packed = { root, compiled, js }
})

const installWithNpm = (
  t: Test,
  {
    name,
    npmInstallArgs,
    tarballs,
  }: {
    name: string
    npmInstallArgs: string[]
    tarballs: Tarball[]
  },
) => {
  const npm = realpathSync(whichSync('npm'))

  const testdir = t.testdir({
    'package.json': JSON.stringify(
      {
        name,
        version: '0.0.0',
        private: true,
      },
      null,
      2,
    ),
  })

  for (const tarball of tarballs) {
    cpSync(tarball.path, join(testdir, basename(tarball.name)))
  }

  const mainTarball = tarballs[0]
  assert(
    mainTarball,
    new Error('main tarball not found', { cause: tarballs }),
  )

  const install = spawnSync(
    npm,
    ['install', `".${sep}${mainTarball.name}"`, ...npmInstallArgs],
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

  return { dir: testdir }
}

const installJs = (
  t: Test,
  npmInstallArgs: string[] = [],
): VariantOptions => {
  const { js } = t.context.packed as Packed
  const { dir } = installWithNpm(t, {
    name: 'root-js-dir-smoke-test',
    npmInstallArgs,
    tarballs: [js],
  })
  return {
    args: bin => [bin],
    PATH: [
      dirname(realpathSync(whichSync('node'))),
      join(dir, 'node_modules', '.bin'),
    ].join(delimiter),
  }
}

const installPacked = (
  t: Test,
  npmInstallArgs: string[] = [],
): VariantOptions => {
  const { root, compiled } = t.context.packed as Packed
  const { dir } = installWithNpm(t, {
    name: 'root-compile-dir-smoke-test',
    npmInstallArgs,
    tarballs: [root, ...compiled],
  })
  return {
    args: bin => [bin],
    PATH: [join(dir, 'node_modules', '.bin')].join(delimiter),
  }
}

t.test('js', async t => {
  const v = installJs(t)
  t.test('node_modules/.bin', async t => {
    const res = await runVariant(v, t, ['--version'], { shell: true })
    t.equal(res.status, 0)
    t.equal(res.stdout, Cli.version)
  })
})

// TODO(compile): turn back on once the compiled CLI is ready
t.skip('compiled works by default', async t => {
  const v = installPacked(t)
  t.test('node_modules/.bin', async t => {
    const res = await runVariant(v, t, ['--version'], { shell: true })
    t.equal(res.status, 0)
    t.equal(res.stdout, Cli.version)
  })
})

// TODO(compile): turn back on once the compiled CLI is ready
t.skip('compiled fails with --ignore-scripts', async t => {
  const v = installPacked(t, ['--ignore-scripts'])
  t.test('node_modules/.bin', async t => {
    const res = await runVariant(v, t, ['--version'], { shell: true })
    t.ok(typeof res.status === 'number' && res.status > 0)
  })
})
