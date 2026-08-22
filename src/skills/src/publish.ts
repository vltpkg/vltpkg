import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import type { Skill } from './types.ts'

export const writeSkill = (
  skill: Skill,
  files: string[],
  outputRoot: string,
) => {
  const destDir = join(outputRoot, skill.name)
  if (existsSync(destDir)) rmSync(destDir, { recursive: true })
  for (const rel of files) {
    const dest = join(destDir, rel)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(join(skill.dir, rel), dest)
  }
  writeFileSync(join(destDir, '.generated'), '')
}

/** Remove previously-generated skill directories that no longer exist. */
export const cleanStale = (
  outputRoot: string,
  currentNames: Set<string>,
) => {
  if (!existsSync(outputRoot)) return
  for (const name of readdirSync(outputRoot)) {
    if (currentNames.has(name)) continue
    const dir = join(outputRoot, name)
    if (!statSync(dir).isDirectory()) continue
    if (existsSync(join(dir, '.generated'))) {
      rmSync(dir, { recursive: true })
    }
  }
}

/** Remove previously-generated archives and manifest, always rebuilt fresh. */
export const cleanManifestArtifacts = (outputRoot: string) => {
  if (!existsSync(outputRoot)) return
  for (const name of readdirSync(outputRoot)) {
    if (name.endsWith('.tar.gz') || name === 'index.json') {
      rmSync(join(outputRoot, name))
    }
  }
}
