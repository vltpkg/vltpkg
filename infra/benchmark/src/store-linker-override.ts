#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const linkers = new Set(['auto', 'hardlink', 'copy', 'unpack'])

/**
 * Env lines from a `bench-store-linker=<tracked>[,<control>]` line of
 * its own in a PR body; mentions in prose don't count. `<tracked>` is
 * the benchmark Bencher tracks; `<control>` runs in the same job as a
 * second hyperfine command.
 */
export const storeLinkerOverride = (body: string): string[] => {
  const line = body
    .split('\n')
    .map(l => l.trim())
    .find(l => /^bench-store-linker=[a-z,]+$/.test(l))
  if (!line) return []
  const values = line.slice(line.indexOf('=') + 1).split(',')
  const [tracked, control] = values
  if (values.length > 2 || !values.every(v => linkers.has(v))) {
    throw new Error(`Invalid ${line}`)
  }
  return [
    `VLT_STORE_LINKER=${tracked}`,
    ...(control ?
      [`BENCH_BINARY=vlt,VLT_STORE_LINKER=${control} vlt`]
    : []),
  ]
}

export const storeLinkerOverrideFile = (
  body: string,
  file: string,
) => {
  const lines = storeLinkerOverride(body)
  for (const l of lines) appendFileSync(file, `${l}\n`)
  return lines
}

/* c8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.env.GITHUB_ENV
  if (!file) throw new Error('GITHUB_ENV not set')
  for (const l of storeLinkerOverrideFile(
    process.env.PR_BODY ?? '',
    file,
  )) {
    console.log(l)
  }
}
/* c8 ignore stop */
