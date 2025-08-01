#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { join, relative, resolve, sep, posix, win32 } from 'node:path'
import { rm, mkdir, writeFile, chmod } from 'node:fs/promises'
import {
  VARIANTS,
  BINS,
  createArtifacts,
  createVariants as createVariantsBase,
} from '@vltpkg/infra-build'
import { ROOT } from './utils.ts'

const LANGUAGES = ['sh', 'pwsh'] as const

const getLevelToRoot = (dir: string) =>
  relative(dir, ROOT)
    .split(sep)
    .filter(v => v === '..').length

const EOF = '\n'
const q = (str: string) => `"${str}"`
const i = (str: string | string[], level = 1) => {
  const lines = (Array.isArray(str) ? str : str.split(EOF)).map(
    v => ' '.repeat(level * 2) + v,
  )
  return lines.length ? lines.join(EOF) : null
}

const writeBin = async (
  file: string,
  contents: (string | null)[],
) => {
  await writeFile(
    file,
    contents.filter(v => v !== null).join(EOF) + EOF,
  )
  await chmod(file, 0o755)
}

type SyntaxFn = (opts: {
  dir: string
  file: string
  prepare?: string | false
  cmd: string[]
  env: [string, string][]
  replaceDir: (v: string, p: string) => string
}) => (string | null)[]

const sh: SyntaxFn = opts => {
  const rootName = 'ROOT_DIR'
  const replaceDir = (v: string) => opts.replaceDir(v, `$${rootName}`)

  const getRoot = q(
    `$(cd "$(dirname "$0")/${'../'.repeat(getLevelToRoot(opts.dir))}" && pwd)`,
  )

  const file = replaceDir(opts.file)

  const env = opts.env.map(([k, v]) => `${k}=${q(v)}`).join(' ')
  const cmd = [
    ...opts.cmd
      .map(v => replaceDir(v))
      .map(v => (v.startsWith(`$${rootName}`) ? q(v) : v)),
    q('$@'),
  ].join(' ')

  const prepare =
    opts.prepare ?
      [
        `if [ ! -f "${file}" ]; then`,
        i(`(cd $ROOT_DIR && ${opts.prepare} > /dev/null 2>&1)`),
        'fi',
      ]
    : []

  return [
    '#!/bin/bash',
    'set -eo pipefail',
    `${rootName}=${getRoot}`,
    ...prepare,
    [env, cmd].filter(Boolean).join(' '),
  ]
}

const pwsh: SyntaxFn = opts => {
  const rootName = 'RootDir'
  const replaceDir = (v: string) => opts.replaceDir(v, `$${rootName}`)

  const getRoot = Array<null>(getLevelToRoot(opts.dir))
    .fill(null)
    .reduce(c => `(Split-Path -Parent ${c})`, '$PSScriptRoot')

  const file = replaceDir(opts.file)

  const cleanedCmd = opts.cmd
    .map(v => replaceDir(v))
    .map(v => (v.startsWith(`$${rootName}`) ? q(v) : v))
  const cmd = [
    cleanedCmd[0]?.startsWith('"') ? '&' : '',
    ...cleanedCmd,
    '@ScriptArgs',
  ].filter(Boolean)

  const prepare =
    opts.prepare ?
      [
        `if (-not (Test-Path ${q(file)})) {`,
        i('& {'),
        i(`Set-Location ${q(`$${rootName}`)}`, 2),
        i(`${opts.prepare} > $null 2>&1`, 2),
        i('}'),
        '}',
      ]
    : []

  return [
    // TODO: why does this stricter error handling does not work on Windows for the compiled version?
    // '$ErrorActionPreference = "Stop"',
    // '$PSNativeCommandUseErrorActionPreference = $true',
    '$ScriptArgs = $args',
    `$${rootName} = ${getRoot}`,
    ...prepare,
    '& {',
    i(opts.env.map(([k, v]) => `$env:${k} = ${q(v)}`)),
    i(cmd.join(' ')),
    '}',
  ]
}

const createVariants = ({
  windows,
}: {
  windows?: boolean
} = {}) => {
  const REPLACE_DIR = '__DIR__'
  const path = windows ? win32 : posix
  return {
    path,
    replaceDir: (v: string, parts: string[]) =>
      v.replace(REPLACE_DIR, path.join(...parts)),
    variants: createVariantsBase({
      artifacts: createArtifacts({
        windows,
        dirs: {
          Source: REPLACE_DIR,
          Bundle: REPLACE_DIR,
          Compile: REPLACE_DIR,
        },
      }),
    }),
  } as const
}

const Langs = {
  sh: {
    syntax: sh,
    ext: '',
    ...createVariants(),
  },
  pwsh: {
    syntax: pwsh,
    ext: '.ps1',
    ...createVariants({ windows: true }),
  },
} as const

const Dirs = {
  Source: {
    source: ['infra', 'build', 'src', 'bins'],
    dest: '',
    prepare: false,
  },
  Deno: {
    source: ['infra', 'build', 'src', 'bins'],
    dest: 'deno',
    prepare: false,
  },
  Bundle: {
    source: ['.build-bundle'],
    dest: 'bundle',
    prepare: 'bundle',
  },
  DenoBundle: {
    source: ['.build-bundle'],
    dest: 'deno-bundle',
    prepare: 'bundle',
  },
  Compile: {
    source: ['.build-compile'],
    dest: 'compile',
    prepare: 'compile',
  },
} as const

const main = async () => {
  const localBinDir = resolve(ROOT, 'scripts', 'bins')
  await rm(localBinDir, { recursive: true, force: true })
  await mkdir(localBinDir, { recursive: true })

  await Promise.all(
    VARIANTS.map(async variantName => {
      const { source, dest, prepare } = Dirs[variantName]
      const dir = join(localBinDir, dest)
      await mkdir(dir, { recursive: true })

      return Promise.all(
        LANGUAGES.flatMap(lang => {
          const { syntax, path, ext, variants, replaceDir } =
            Langs[lang]
          const { artifact, env, args } = variants[variantName]

          return BINS.map(async bin => {
            const prepareCmd =
              prepare ?
                `pnpm vlt-build --bins=${bin} --outdir=${q(path.join(...source))} ${prepare}`
              : false

            await writeBin(
              join(dir, `${bin}${ext}`),
              syntax({
                dir,
                prepare: prepareCmd,
                replaceDir: (v, p) => replaceDir(v, [p, ...source]),
                file: artifact.bin(bin),
                env: Object.entries({
                  ...env,
                  ...(variantName === 'Source' ?
                    { __VLT_INTERNAL_LIVE_RELOAD: '1' }
                  : undefined),
                }),
                cmd: args(bin),
              }),
            )
          })
        }),
      )
    }),
  )
}

await main()
