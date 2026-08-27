/**
 * Moves the Astro Vercel adapter's build output to the repo root.
 *
 * `@astrojs/vercel` always writes `.vercel/output` next to
 * `astro.config.mts` (i.e. `www/docs/.vercel/output`). The Vercel
 * project's Root Directory is the repo root (required so the
 * typedoc step can read sibling workspaces like `src/graph`), and
 * Vercel's Build Output API auto-detection only looks for
 * `.vercel/output` at Root Directory — it does not search nested
 * directories. Without this relocation, Vercel falls back to
 * guessing a static `dist` output and the deploy fails or serves
 * an incomplete site (functions/routes silently dropped).
 */
import { existsSync, mkdirSync, rmSync, renameSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const from = resolve(import.meta.dirname, '../.vercel/output')
const to = resolve(import.meta.dirname, '../../../.vercel/output')

if (!existsSync(from)) {
  console.error(`relocate-vercel-output: nothing found at ${from}`)
  process.exit(1)
}

mkdirSync(dirname(to), { recursive: true })
rmSync(to, { recursive: true, force: true })
renameSync(from, to)
console.log(`relocate-vercel-output: moved output to ${to}`)
