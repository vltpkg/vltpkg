import t from 'tap'
import type { Test } from 'tap'
import { Bins } from './fixtures/variants.ts'
import type { Variant } from './fixtures/variants.ts'
import { runVariant } from './fixtures/run.ts'
import { join, resolve, basename, sep } from 'node:path'
import { cpSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert'
import Cli from '@vltpkg/cli-sdk/package.json' with { type: 'json' }

type Tarball = { path: string; name: string }
type Packed<T = Tarball> = { root: Tarball | T; tarballs: Tarball[] }

class PackTarballs {
  #PACKED: Packed | null = null

  get packed() {
    assert(
      this.#PACKED,
      'pack() must be called before accessing packed',
    )
    return this.#PACKED
  }

  constructor() {
    this.#PACKED = this.pack()
  }

  pack() {
    const packed = spawnSync(
      'pnpm',
      ['--filter', '"./infra/cli-*"', 'exec', 'pnpm', 'pack'],
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
      packed.status === 0,
      new Error(`Failed to pack tarballs`, { cause: packed }),
    )

    const { root, tarballs } = packed.stdout
      .split('\n')
      .filter(l => l.includes('.tgz'))
      .map(l => ({ path: l, name: basename(l) }))
      .reduce<Packed<null>>(
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

    assert(
      root,
      new Error('root tarball not found', { cause: packed }),
    )
    assert(
      tarballs.length,
      new Error('platform tarballs not found', { cause: packed }),
    )

    return { root, tarballs }
  }
}

const packer = new PackTarballs()

const installPacked = (
  t: Test,
  p: PackTarballs,
  npmInstallArgs: string[] = [],
): Variant => {
  const testdir = t.testdir({
    'package.json': JSON.stringify({
      name: 'root-compile-dir-smoke-test',
      version: '0.0.0',
      private: true,
    }),
  })

  const { root, tarballs } = p.packed

  cpSync(root.path, join(testdir, basename(root.name)))
  for (const tarball of tarballs) {
    cpSync(tarball.path, join(testdir, basename(tarball.name)))
  }

  const install = spawnSync(
    'npm',
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
    spawn: bin => [bin],
    PATH: join(testdir, 'node_modules', '.bin'),
  }
}

t.test(
  'postinstall script works to place platform specific bins',
  async t => {
    const v = installPacked(t, packer)
    t.test('vlt --version', async t => {
      const res = await runVariant(v, t, ['--version'])
      t.equal(res.status, 0)
      t.equal(res.stdout, Cli.version)
      t.equal(res.stderr, '')
    })
  },
)

t.test(
  'no bins exist if --ignore-scripts is passed to npm install',
  async t => {
    const v = installPacked(t, packer, ['--ignore-scripts'])
    t.test('vlt --version', async t => {
      const res = await runVariant(v, t, ['--version'])
      t.ok(typeof res.status === 'number' && res.status > 0)
      t.equal(res.stdout, '')
      t.ok(res.stderr, 'wrote something to stderr')
    })
  },
)
