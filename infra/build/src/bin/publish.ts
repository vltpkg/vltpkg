import { join, resolve } from 'node:path'
import assert from 'node:assert'
import { spawnSync, type SpawnSyncOptions } from 'node:child_process'
import { parseArgs as nodeParseArgs } from 'node:util'
import {
  copyFileSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import generateMatrix, {
  getMatrix,
  matrixConfig,
  type BundleDir,
  type CompilationDir,
} from '../matrix.js'
import { Paths } from '../index.js'
import * as types from '../types.js'

const PUBLISH_TOKEN = 'NPM_PUBLISH_TOKEN'
const DATE_ID = `${Date.now()}`

type Package = BundleDir | CompilationDir

const parseArgs = () => {
  const { outdir, forReal, ...matrix } = nodeParseArgs({
    options: {
      outdir: { type: 'string' },
      forReal: { type: 'boolean' },
      ...matrixConfig,
    },
  }).values

  return {
    /* c8 ignore next */
    outdir: resolve(outdir ?? '.publish'),
    /* c8 ignore next */
    npmArgs: forReal ? [] : ['--dry-run'],
    matrix: getMatrix(matrix),
  }
}

const npm = (
  pkg: Package,
  args: string[],
  options: Omit<SpawnSyncOptions, 'cwd' | 'stdio' | 'shell'> = {},
) =>
  spawnSync('npm', args, {
    cwd: pkg.dir,
    stdio: 'inherit',
    shell: true,
    ...options,
    env: {
      ...process.env,
      ...options.env,
    },
  })

const getToken = (bin: types.Bin) => {
  if (process.env.CI) {
    return process.env.VLT_CLI_PUBLISH_TOKEN
  }
  const { sections, fields } = JSON.parse(
    spawnSync(
      'op',
      [
        'item',
        'get',
        '"npm - Ops Account"',
        '--format=json',
        '--account=vltpkg.1password.com',
      ],
      { shell: true, encoding: 'utf8' },
    ).stdout,
  ) as {
    sections?: { label?: string; id?: string }[]
    fields?: {
      section?: { id?: string }
      label?: string
      value?: string
    }[]
  }
  /* c8 ignore start - make sure op CLI response is expected shape  */
  const section = sections?.find(s => s.label === 'tokens')?.id
  const token = fields?.find(
    f => f.section?.id === section && f.label === bin,
  )?.value
  /* c8 ignore stop */
  assert(typeof token === 'string', 'token')
  return token
}

const transformJsonFile = <U extends Record<string, any>>(
  dir: string,
  f: string,
  t: (v: U) => U,
) => {
  const p = join(dir, f)
  return writeFileSync(
    p,
    JSON.stringify(t(JSON.parse(readFileSync(p, 'utf8'))), null, 2),
  )
}

const keysToObj = (arr: string[], t: (k: string) => string) =>
  arr.reduce<Record<string, string>>((acc, k) => {
    acc[k] = t(k)
    return acc
  }, {})

const writeFiles = (
  name: string,
  { dir, format, compileId }: Package,
  { bins = types.BinNames }: { bins?: types.Bin[] },
) => {
  const { dirs, files } = readdirSync(dir, {
    withFileTypes: true,
  }).reduce<{ dirs: string[]; files: string[] }>(
    (acc, f) => {
      acc[f.isDirectory() ? 'dirs' : 'files'].push(f.name)
      return acc
    },
    { dirs: [], files: [] },
  )
  const binPath = (p: string) => `${p}${compileId ? '' : '.js'}`
  writeFileSync(
    join(dir, '.npmrc'),
    `//registry.npmjs.org/:_authToken=\${${PUBLISH_TOKEN}}`,
  )
  for (const f of ['README.md', 'LICENSE', 'package.json']) {
    copyFileSync(join(Paths.CLI, f), join(dir, f))
  }
  transformJsonFile(dir, 'package.json', p => ({
    name,
    version: `${p.version}.${DATE_ID}`,
    type: format === types.Formats.Cjs ? 'commonjs' : 'module',
    bin: keysToObj(bins, binPath),
    files: [
      ...dirs.map(d => `${d}/`),
      ...files.filter(f => {
        const base = f.split('.')[0]
        const bin = types.isBin(base) ? base : null
        return bin && bins.includes(bin)
      }),
    ],
    ...keysToObj(['description', 'license', 'engines'], k => p[k]),
  }))
}

const main = async () => {
  const { outdir, matrix, npmArgs } = parseArgs()

  rmSync(outdir, { recursive: true, force: true })
  const { bundles, compilations } = await generateMatrix({
    outdir,
    verbose: true,
    matrix,
  })
  const pkg = bundles[0] ?? compilations[0]
  assert(
    bundles.length + compilations.length === 1,
    'should only have 1 package to publish',
  )
  assert(pkg, 'could not find package to publish')

  const [opts = {}, args = []] =
    'runtime' in pkg && pkg.runtime === 'deno' ?
      [{ bins: [types.Bins.vlt] }, ['--tag=deno']]
    : []

  const registryPackageToPublish = 'vlt'
  writeFiles(registryPackageToPublish, pkg, opts)
  npm(pkg, ['publish', ...npmArgs, ...args], {
    env: {
      [PUBLISH_TOKEN]: getToken(registryPackageToPublish),
    },
  })
}

await main()
