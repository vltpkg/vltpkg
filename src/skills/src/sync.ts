import { mkdirSync } from 'node:fs'
import {
  discoverHandAuthoredSkills,
  discoverSkills,
} from './discover.ts'
import { buildManifestEntry, writeIndex } from './manifest.ts'
import type { ManifestEntry } from './manifest.ts'
import {
  cleanManifestArtifacts,
  cleanStale,
  writeArchive,
  writeSkill,
} from './publish.ts'
import { resolveSkillFiles } from './resolve-files.ts'

/**
 * Discover every skill under `srcRoot`, publish its resolved file set
 * to `outputRoot`, remove stale generated output, and (re)generate the
 * `.well-known/agent-skills` discovery manifest — covering both
 * generated and hand-authored skills. Returns a summary count for
 * logging.
 */
export const syncAgentSkills = async (
  srcRoot: string,
  outputRoot: string,
  siteUrl: string,
): Promise<{
  skillCount: number
  fileCount: number
  archiveCount: number
}> => {
  const skills = discoverSkills(srcRoot)
  mkdirSync(outputRoot, { recursive: true })

  let fileCount = 0
  const names = new Set<string>()
  const resolvedFiles = new Map<string, string[]>()
  for (const skill of skills) {
    names.add(skill.name)
    const files = resolveSkillFiles(skill)
    resolvedFiles.set(skill.name, files)
    writeSkill(skill, files, outputRoot)
    fileCount += files.length
  }
  cleanStale(outputRoot, names)
  cleanManifestArtifacts(outputRoot)

  const handAuthored = discoverHandAuthoredSkills(outputRoot, names)
  const allSkills = [...skills, ...handAuthored]

  const built = await Promise.all(
    allSkills.map(async skill => {
      const files =
        resolvedFiles.get(skill.name) ?? resolveSkillFiles(skill)
      return {
        skill,
        ...(await buildManifestEntry(skill, files, siteUrl)),
      }
    }),
  )

  let archiveCount = 0
  const entries: ManifestEntry[] = []
  for (const { skill, entry, archive } of built) {
    entries.push(entry)
    if (archive) {
      writeArchive(skill, archive, outputRoot)
      archiveCount++
    }
  }
  writeIndex(outputRoot, entries)

  return { skillCount: skills.length, fileCount, archiveCount }
}
