// Copy each root skills/<name>/ with its own SKILL.md into
// dist/skills/<name>/, where `vlt skills` finds them in the installed
// package. evals/ stay in the repo.
import { cpSync, lstatSync, readdirSync, rmSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const from = resolve(import.meta.dirname, '../../../skills')
const dist = resolve(import.meta.dirname, '../dist')

rmSync(dist, { recursive: true, force: true })
let copied = 0
for (const d of readdirSync(from, { withFileTypes: true })) {
  if (!d.isDirectory()) continue
  const dir = resolve(from, d.name)
  const skillMd = lstatSync(resolve(dir, 'SKILL.md'), {
    throwIfNoEntry: false,
  })
  if (!skillMd?.isFile()) continue
  cpSync(dir, resolve(dist, 'skills', d.name), {
    recursive: true,
    filter: source => basename(source) !== 'evals',
  })
  copied++
}
if (!copied) throw new Error(`no skills in ${from}`)
