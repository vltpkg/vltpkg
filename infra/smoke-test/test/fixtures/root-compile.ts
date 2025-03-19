import { join, resolve, basename, sep } from 'node:path'
import { mkdirSync, cpSync, writeFileSync } from 'node:fs'
import type { Bin } from '@vltpkg/infra-build'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert'

// Only pack the CLIs once per test run
let PACKED_CLIS: PackedCLIs | null = null

type Tarball = { path: string; name: string }
type PackedCLIs = { root: Tarball; tarballs: Tarball[] }

const packCLIs = ({ bins }: { bins: readonly Bin[] }): PackedCLIs => {
  if (PACKED_CLIS) {
    return PACKED_CLIS
  }

  const packed = spawnSync(
    'pnpm',
    ['--filter', '"./infra/cli-*"', 'exec', 'pnpm', 'pack'],
    {
      cwd: resolve(import.meta.dirname, '../../../..'),
      stdio: 'pipe',
      encoding: 'utf8',
      shell: true,
      windowsHide: true,
      env: {
        ...process.env,
        __VLT_INTERNAL_LOCAL_OPTIONAL_DEPS: '1',
        __VLT_INTERNAL_COMPILED_BINS: bins.join(','),
      },
    },
  )

  const { root, tarballs } = packed.stdout
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

  assert(root, 'root tarball not found')
  assert(tarballs.length, 'platform tarballs not found')

  PACKED_CLIS = { root, tarballs }
  return PACKED_CLIS
}

export const rootCompile = ({
  outdir,
  bins,
  noScripts,
}: {
  outdir: string
  bins: readonly Bin[]
  noScripts?: boolean
}) => {
  const { root, tarballs } = packCLIs({ bins })
  mkdirSync(outdir, { recursive: true })
  cpSync(root.path, join(outdir, basename(root.name)))
  for (const tarball of tarballs) {
    cpSync(tarball.path, join(outdir, basename(tarball.name)))
  }
  writeFileSync(
    join(outdir, 'package.json'),
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
    [
      'install',
      `".${sep}${root.name}"`,
      ...(noScripts ? ['--ignore-scripts'] : []),
    ],
    {
      cwd: outdir,
      stdio: 'pipe',
      encoding: 'utf8',
      shell: true,
      windowsHide: true,
    },
  )
  if (install.status !== 0) {
    throw new Error(`Failed to install root tarball`, {
      cause: install,
    })
  }
}
