// The agent skills this repo publishes live in its root skills/ folder,
// the layout `vlx skills add vltpkg/vltpkg` (skills.sh) installs from.
// Publish them into public/ so the docs serve each one at
// /skills/<name>/SKILL.md, where src/lib/skills.ts reads it at build,
// and list them at /.well-known/agent-skills/index.json.
import { resolve } from 'node:path'
import { publishSkills } from '../src/lib/publish-skills.ts'

publishSkills(
  resolve(import.meta.dirname, '../../../skills'),
  resolve(import.meta.dirname, '../public'),
)
