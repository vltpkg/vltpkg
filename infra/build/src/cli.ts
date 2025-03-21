#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { parseArgs } from 'node:util'
import { mkdirSync, rmSync } from 'node:fs'
import assert from 'node:assert'
import { resolve } from 'node:path'
import { bundle } from './bundle.ts'
import { compile } from './compile.ts'
import { isBin } from './bins.ts'

const parseOptions = () => {
  const {
    values: { outdir, platform, arch, bins, quiet },
    positionals: [action = 'bundle'],
  } = parseArgs({
    allowPositionals: true,
    options: {
      outdir: { type: 'string' },
      platform: { type: 'string' },
      arch: { type: 'string' },
      bins: { type: 'string', multiple: true },
      quiet: { type: 'boolean' },
    },
  })

  assert(outdir, 'outdir is required')
  assert(!bins || bins.every(isBin), 'invalid bins')

  return [
    action,
    { outdir: resolve(outdir), platform, arch, bins, quiet },
  ] as const
}

const main = async () => {
  const [action, opts] = parseOptions()

  rmSync(opts.outdir, { recursive: true, force: true })
  mkdirSync(opts.outdir, { recursive: true })

  switch (action) {
    // Bundle the JS version of the CLI
    case 'bundle':
      return bundle(opts)
    // Compile the binary version of the CLI
    case 'compile':
      return compile(opts)
    /* c8 ignore next 2 */
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

console.log(await main())
