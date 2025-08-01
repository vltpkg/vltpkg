import os, { EOL, tmpdir } from 'node:os'
import assert from 'node:assert'
import { join, resolve } from 'node:path'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import {
  bundle,
  basenameWithoutExtension,
  findEntryBins,
  withoutExtension,
} from './bundle.ts'
import type { Bin } from './bins.ts'

const spawnCompile = ({
  source,
  outdir,
  entry,
  exclude,
  arch,
  platform,
}: {
  source: string
  outdir: string
  quiet?: boolean
  entry: string
  exclude: string[]
  arch: string
  platform: string
}) => {
  const outfile = join(outdir, basenameWithoutExtension(entry))

  const files = readdirSync(source, {
    recursive: true,
    withFileTypes: true,
  })
    .filter(f => f.isFile())
    .map(f => join(f.parentPath, f.name))
    .filter(f => f !== entry && !exclude.includes(f))

  const nonSourcemapFiles = files.filter(f => !f.endsWith('.js.map'))

  // Not implemented yet!
  // But this is where the compiled binary would be written.
  // Just use these variables for now because they will be needed later.
  // TODO(compile): use a child process to create the compiled binary
  writeFileSync(
    /* c8 ignore next */
    outfile + (process.platform === 'win32' ? '.exe' : ''),
    [arch, platform, ...files, ...nonSourcemapFiles].join(EOL),
  )

  const compiledOutfile = readdirSync(outdir).find(
    f =>
      basenameWithoutExtension(f) === basenameWithoutExtension(entry),
  )
  assert(compiledOutfile, 'no compiled file found')
  return join(outdir, compiledOutfile)
}

export type Options = {
  outdir: string
  quiet?: boolean
  bins?: readonly Bin[]
  arch?: string
  platform?: string
}

export const compile = async ({
  outdir,
  quiet,
  bins,
  arch = os.arch(),
  platform = os.platform(),
}: Options) => {
  mkdirSync(outdir, { recursive: true })

  const { outdir: source } = await bundle({
    outdir: resolve(
      tmpdir(),
      `vlt-bundle-${Math.random().toString().slice(2, 10)}`,
    ),
    internalDefine: {
      COMPILED: 'true',
    },
  })

  assert(source, 'source is required')

  const entries = findEntryBins(source, bins)
  assert(entries.length, 'no bins found')

  const files: string[] = []
  for (const entry of entries) {
    files.push(
      spawnCompile({
        source,
        outdir,
        quiet,
        entry,
        exclude: entries
          .filter(b => b !== entry)
          .map(b => withoutExtension(b))
          .flatMap(b => [`${b}.js`, `${b}.js.map`]),
        arch,
        platform,
      }),
    )
  }

  return { outdir, files }
}
