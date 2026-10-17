#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { bundle } from './bundle.ts'

const stage = mkdtempSync(join(tmpdir(), 'vlt-compile-'))
try {
  const payload = join(stage, 'payload')
  const { scripts } = await bundle({
    outdir: payload,
    bins: ['vlt'],
    minify: true,
    sourcemap: false,
  })
  const entry = join(stage, 'launcher.js')
  writeFileSync(
    entry,
    `import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const payload = resolve(import.meta.dirname, 'payload')
const helpers = new Set(${JSON.stringify(scripts)}.map(name => resolve(payload, name)))
const helper = process.argv[2]
if (helpers.has(helper)) {
  process.argv.splice(1, 1)
  await import(pathToFileURL(helper).href)
} else {
  await import(pathToFileURL(resolve(payload, 'vlt.js')).href)
}
`,
  )
  execFileSync(
    'bun',
    [
      'build',
      '--compile',
      entry,
      '--asset',
      payload,
      '--no-compile-autoload-dotenv',
      '--no-compile-autoload-bunfig',
      '--outfile',
      resolve(process.argv[2] ?? '.build-bun/vlt'),
      ...process.argv.slice(3),
    ],
    { stdio: 'inherit' },
  )
} finally {
  rmSync(stage, { recursive: true, force: true })
}
