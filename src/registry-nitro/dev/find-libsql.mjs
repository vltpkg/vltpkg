import { currentTarget } from '@neon-rs/load'
import assert from 'node:assert'
import { readdirSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'

const TARGET = currentTarget()

const PNPM_DIR = resolve(
  import.meta.dirname,
  '../../../node_modules/.pnpm',
)

const OUTPUT_DIR = resolve(import.meta.dirname, '../.output/server')

const foundLibsqlPlatform = readdirSync(PNPM_DIR, {
  withFileTypes: true,
}).find(entry => entry.name.startsWith(`@libsql+${TARGET}`))

assert(foundLibsqlPlatform, 'LibSQL platform not found')

cpSync(
  resolve(
    foundLibsqlPlatform.parentPath,
    foundLibsqlPlatform.name,
    'node_modules/@libsql',
    TARGET,
  ),
  resolve(OUTPUT_DIR, 'node_modules/@libsql', TARGET),
  { recursive: true },
)
