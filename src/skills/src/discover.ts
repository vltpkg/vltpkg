import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Skill } from './types.ts'

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
      if (
        statSync(dir).isDirectory() &&
        existsSync(join(dir, 'SKILL.md'))
      ) {
        const existing = skills.find(s => s.name === name)
        if (existing) {
          throw new Error(
            `duplicate skill name "${name}": ${existing.dir} and ${dir}`,
          )
        }
        skills.push({ name, dir })
      }
    }
  }
  return skills
}

/**
 * Find hand-authored skill directories already sitting in `outputRoot`
 * (no `.generated` sentinel, so the sync script never writes into
 * them) so they can be included in the discovery manifest too.
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
    if (
      statSync(dir, { throwIfNoEntry: false })?.isDirectory() &&
      existsSync(join(dir, 'SKILL.md'))
    ) {
      skills.push({ name, dir })
    }
  }
  return skills
}
