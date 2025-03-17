import { bundle, compile } from '@vltpkg/infra-build'
import { BUNDLE_DIR, COMPILE_DIR, ROOT_COMPILE_DIR } from './run.ts'
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, cpSync, writeFileSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import assert from 'node:assert'
import t from 'tap'

t.comment('create bundles and compiled binaries for smoke tests')

// only bundle/compile the vlt binary since that is all we test
// this makes the tests run faster
const bins = ['vlt'] as const

rmSync(BUNDLE_DIR, { recursive: true, force: true })
await bundle({ outdir: BUNDLE_DIR, bins })

rmSync(COMPILE_DIR, { recursive: true, force: true })
await compile({ outdir: COMPILE_DIR, stdio: 'pipe', bins })

// Used for testing the postinstall script, might not work on windows
if (process.env.__VLT_INTERNAL_SMOKE_TEST?.includes('rootCompile')) {
  const packed = spawnSync(
    'pnpm',
    ['--filter', './infra/cli-*', 'exec', 'pnpm', 'pack'],
    {
      cwd: resolve(import.meta.dirname, '../../../..'),
      stdio: 'pipe',
      encoding: 'utf8',
      env: {
        ...process.env,
        __VLT_INTERNAL_LOCAL_OPTIONAL_DEPS: '1',
        __VLT_INTERNAL_COMPILED_BINS: bins.join(','),
      },
    },
  )
  const tarballs = packed.stdout
    .split('\n')
    .filter(l => l.includes('.tgz'))
    .map(l => ({ path: l, name: basename(l) }))
  const rootTarball = tarballs.find(t =>
    t.path.includes(`${sep}cli-compiled${sep}`),
  )
  assert(rootTarball, 'root tarball not found')
  rmSync(ROOT_COMPILE_DIR, { recursive: true, force: true })
  mkdirSync(ROOT_COMPILE_DIR, { recursive: true })
  for (const tarball of tarballs) {
    cpSync(
      tarball.path,
      `${ROOT_COMPILE_DIR}/${basename(tarball.name)}`,
    )
  }
  writeFileSync(
    join(ROOT_COMPILE_DIR, 'package.json'),
    JSON.stringify(
      {
        name: 'root-compile-dir-smoke-test',
        version: '0.0.0',
        private: true,
      },
      null,
      2,
    ),
  )
  const install = spawnSync(
    'npm',
    ['install', `./${rootTarball.name}`],
    {
      cwd: ROOT_COMPILE_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
    },
  )
  if (install.status !== 0) {
    throw new Error(`Failed to install root tarball`, {
      cause: install,
    })
  }
}

t.comment('done')
