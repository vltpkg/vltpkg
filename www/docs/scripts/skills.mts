// The agent skills this repo publishes live in its root skills/ folder,
// the layout `vlx skills add vltpkg/vltpkg` (skills.sh) installs from.
// Copy them into public/skills so the docs serve each one at
// /skills/<name>/SKILL.md, where src/lib/skills.ts reads it at build.
import { cpSync, lstatSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const from = resolve(import.meta.dirname, '../../../skills')
const to = resolve(import.meta.dirname, '../public/skills')

rmSync(to, { recursive: true, force: true })
// only folders with their own SKILL.md: skips symlinks and scope folders,
// like the skill mounts #1540 plans to put here
for (const d of readdirSync(from, { withFileTypes: true })) {
  if (!d.isDirectory()) continue
  const dir = resolve(from, d.name)
  const skillMd = lstatSync(resolve(dir, 'SKILL.md'), {
    throwIfNoEntry: false,
  })
  if (skillMd?.isFile()) {
    cpSync(dir, resolve(to, d.name), { recursive: true })
  }
}
