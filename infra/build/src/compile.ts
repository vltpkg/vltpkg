import assert from 'node:assert'
import { sep, join, relative, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import * as types from './types.ts'
import { Paths } from './index.ts'

export type CompileOptions = types.CompileFactors & {
  source: string
  outdir: string
  bin: types.Bin
}

const randIdent = () => `_${randomBytes(6).toString('hex')}`

const getTarget = (o: types.CompileFactors) => {
  if (o.runtime === types.Runtimes.Bun) {
    return [
      'bun',
      {
        [types.Platforms.Linux]: 'linux',
        [types.Platforms.Win]: 'windows',
        [types.Platforms.Mac]: 'mac',
      }[o.platform],
      {
        [types.Archs.arm64]: 'arm64',
        [types.Archs.x64]: 'x64',
      }[o.arch],
    ].join('-')
  }
  if (o.runtime === types.Runtimes.Deno) {
    return [
      {
        [types.Archs.arm64]: 'aarch64',
        [types.Archs.x64]: 'x86_64',
      }[o.arch],
      {
        [types.Platforms.Linux]: 'unknown-linux-gnu',
        [types.Platforms.Win]: 'pc-windows-msvc',
        [types.Platforms.Mac]: 'apple-darwin',
      }[o.platform],
    ].join('-')
  }
  // XXX: we should evaluate other tools or fork/contribute node22+
  // compatability to pkg if we decide to use node compilation long-term
  throw new Error(`unsupported runtime for compilation: ${o.runtime}`)
}

const getCompileOptions = (
  outfile: string,
  o: CompileOptions,
): {
  command: string
  args: string[] | ((f: Record<string, string>) => string[])
  positionals: string[]
  setup?: () => Record<string, string>
  teardown?: () => string[]
} => {
  const entry = join(o.source, `${o.bin}.js`)

  const allFiles = readdirSync(o.source, {
    recursive: true,
    withFileTypes: true,
  })
    .filter(f => f.isFile())
    .map(f => ({
      name: f.name,
      relativePath: relative(o.source, join(f.parentPath, f.name)),
      fullPath: join(f.parentPath, f.name),
    }))

  const include = allFiles
    .filter(f => {
      // dont copy root bin files. those are included as the main entry
      if (
        !f.relativePath.includes(sep) &&
        types.BinNames.includes(f.name.split('.')[0] as types.Bin)
      ) {
        return false
      }
      return true
    })
    .map(f => f.fullPath)

  if (o.runtime === types.Runtimes.Bun) {
    return {
      command: 'bun',
      args: [
        'build',
        '--compile',
        '--packages=external',
        `--outfile=${outfile}`,
        `--root=${o.source}`,
      ],
      positionals: [entry, ...include],
      teardown: () =>
        readdirSync(process.cwd(), { withFileTypes: true })
          .filter(d => d.isFile() && d.name.endsWith('.bun-build'))
          .map(d => join(d.parentPath, d.name)),
    }
  }

  if (o.runtime === types.Runtimes.Deno) {
    return {
      command: 'deno',
      args: [
        'compile',
        '-A',
        '--no-check',
        `--output=${outfile}`,
        ...include.map(i => `--include=${i}`),
      ],
      positionals: [entry],
    }
  }

  return {
    command: join(Paths.BUILD_ROOT, 'node_modules/.bin/pkg'),
    args: (f: Record<string, string>) => [
      `--config=${f.config}`,
      `--output=${outfile}`,
      '--public',
      `--public-packages='*'`,
      '--no-bytecode',
    ],
    positionals: [entry],
    setup: () => {
      const config = join(o.outdir, `${randIdent()}.json`)
      const pkg = {
        scripts: include.map(f => relative(o.outdir, f)),
      }
      writeFileSync(config, JSON.stringify({ pkg }, null, 2))
      return { config }
    },
  }
}

export default (o: CompileOptions) => {
  const outfile = join(o.outdir, o.bin)
  mkdirSync(dirname(outfile), { recursive: true })

  const target = getTarget(o)
  const compileOptions = getCompileOptions(outfile, o)

  const files = compileOptions.setup?.() ?? {}
  const args = [
    ...(typeof compileOptions.args === 'function' ?
      compileOptions.args(files)
    : compileOptions.args),
    `--target=${target}`,
    ...compileOptions.positionals,
  ]
  const res = spawnSync(compileOptions.command, args, {
    shell: true,
    encoding: 'utf8',
  })
  assert(
    res.status === 0,
    new Error('compile error', {
      cause: {
        ...res,
        command: compileOptions.command,
        args,
      },
    }),
  )

  for (const f of [
    ...Object.values(files),
    ...(compileOptions.teardown?.() ?? []),
  ]) {
    rmSync(f, { force: true })
  }

  return outfile
}
