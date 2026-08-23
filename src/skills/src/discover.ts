import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { error } from '@vltpkg/error-cause'
import type { Skill } from './types.ts'

const isSkillDir = (dir: string): boolean =>
  !!statSync(dir, { throwIfNoEntry: false })?.isDirectory() &&
  existsSync(join(dir, 'SKILL.md'))

export const discoverSkills = (srcRoot: string): Skill[] => {
  const skills: Skill[] = []
  if (!existsSync(srcRoot)) return skills
  for (const workspace of readdirSync(srcRoot)) {
    const skillsDir = join(srcRoot, workspace, 'skills')
    if (
      !statSync(skillsDir, { throwIfNoEntry: false })?.isDirectory()
    )
      continue
    for (const name of readdirSync(skillsDir)) {
      const dir = join(skillsDir, name)
      if (isSkillDir(dir)) {
        const existing = skills.find(s => s.name === name)
        if (existing) {
          throw error(
            `duplicate skill name "${name}": ${existing.dir} and ${dir}`,
            { path: dir, from: existing.dir },
          )
        }
        skills.push({ name, dir })
      }
    }
  }
  return skills
}

/**
 * Find skill directories already sitting in `outputRoot` whose name
 * isn't one of the just-discovered `generatedNames` — i.e. hand-authored
 * skills, since the sync script only ever writes directories under a
 * generated skill's own name.
 */
export const discoverHandAuthoredSkills = (
  outputRoot: string,
  generatedNames: Set<string>,
): Skill[] => {
  const skills: Skill[] = []
  if (!existsSync(outputRoot)) return skills
  for (const name of readdirSync(outputRoot)) {
    if (generatedNames.has(name)) continue
    const dir = join(outputRoot, name)
    if (isSkillDir(dir)) {
      skills.push({ name, dir })
    }
  }
  return skills
}
