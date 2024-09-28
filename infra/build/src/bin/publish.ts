import { join, resolve } from 'node:path'
import assert from 'node:assert'
import { spawnSync, SpawnSyncOptions } from 'node:child_process'
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
  BundleDir,
  CompilationDir,
} from '../matrix.js'
import { Paths } from '../index.js'
import * as types from '../types.js'

const PUBLISH_TOKEN = 'NPM_PUBLISH_TOKEN'
const DATE_ID = `${Date.now()}`

type Package = BundleDir | CompilationDir

const parseArgs = () => {
  const {
    outdir,
    forReal,
    bins = types.BinNames,
    ...matrix
  } = nodeParseArgs({
    options: {
      outdir: { type: 'string' },
      forReal: { type: 'boolean' },
      bins: { type: 'string', multiple: true },
      ...matrixConfig,
    },
  }).values

  assert(
    bins.every(b => types.isBinName(b)),
    new Error('invalid bin', {
      cause: {
        found: bins,
        wanted: types.BinNames,
      },
    }),
  )

  return {
    /* c8 ignore next */
    outdir: resolve(outdir ?? '.publish'),
    /* c8 ignore next */
    npmArgs: forReal ? [] : ['--dry-run'],
    bins,
    matrix: getMatrix(matrix),
  }
}

const npm = (
  pkg: Package,
  args: string[],
  options: Omit<SpawnSyncOptions, 'cwd' | 'stdio'> = {},
) =>
  spawnSync('npm', args, {
    cwd: pkg.dir,
    stdio: 'inherit',
    ...options,
    env: {
      ...process.env,
      ...options.env,
    },
  })

const getToken = (bin: types.BinName) => {
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

const transformFile = <
  T extends string,
  U extends Record<string, any> | string = T extends (
    `${infer _Prefix}.json`
  ) ?
    Record<string, any>
  : string,
>(
  dir: string,
  f: T,
  t: (v: U) => U,
) => {
  const p = join(dir, f)
  const transform = (s: string) =>
    f.endsWith('.json') ?
      JSON.stringify(t(JSON.parse(s)), null, 2)
    : (t(s as U) as string)
  return writeFileSync(p, transform(readFileSync(p, 'utf8')))
}

const keysToObj = (arr: string[], t: (k: string) => string) =>
  arr.reduce<Record<string, string>>((acc, k) => {
    acc[k] = t(k)
    return acc
  }, {})

const writeFiles = (
  name: string,
  { dir, format, compileId }: Package,
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
  const replaceName = (s: string) =>
    s.replaceAll(types.DefaultBin, name)
  writeFileSync(
    join(dir, '.npmrc'),
    `//registry.npmjs.org/:_authToken=\${${PUBLISH_TOKEN}}`,
  )
  for (const f of ['README.md', 'LICENSE', 'package.json']) {
    copyFileSync(join(Paths.CLI, f), join(dir, f))
  }
  transformFile(dir, 'README.md', replaceName)
  transformFile(dir, 'package.json', p => ({
    name,
    version: `${p.version}.${DATE_ID}`,
    type: format === types.Formats.Cjs ? 'commonjs' : 'module',
    bin:
      name === types.DefaultBin ?
        keysToObj(
          types.BinNames.map(v => v),
          binPath,
        )
      : binPath(name),
    files: [
      ...dirs.map(d => `${d}/`),
      ...files.filter(f => {
        const base = f.split('.')[0]
        const bin = types.isBinName(base) ? base : null
        if (bin && types.BinNames.includes(bin)) {
          return name === types.DefaultBin ? true : bin === name
        }
      }),
    ],
    ...keysToObj(['description', 'license', 'engines'], k => p[k]),
  }))
}

const main = async () => {
  const { outdir, matrix, npmArgs, bins } = parseArgs()

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

  for (const bin of bins) {
    // XXX: skip vlix until we have a package name reserved for it
    if (bin === 'vlix') continue
    writeFiles(bin, pkg)
    npm(pkg, ['publish', ...npmArgs], {
      env: {
        [PUBLISH_TOKEN]: getToken(bin),
      },
    })
  }
}

await main()
