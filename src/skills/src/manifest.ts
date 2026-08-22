import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildArchive, computeDigest } from './archive.ts'
import { parseSkillFrontmatter } from './frontmatter.ts'
import type { Skill } from './types.ts'

/** Schema version for the discovery manifest we emit. */
export const DISCOVERY_SCHEMA =
  'https://schemas.agentskills.io/discovery/0.2.0/schema.json'

export type ManifestEntry = {
  name: string
  type: 'skill-md' | 'archive'
  description: string
  url: string
  digest: string
}

/**
 * Build this skill's discovery-manifest entry. A skill made of just
 * `SKILL.md` is listed as `type: "skill-md"`, referenced directly; a
 * skill with supporting files is bundled as `type: "archive"`, the
 * only two artifact shapes the discovery RFC defines.
 */
export const buildManifestEntry = async (
  skill: Skill,
  files: string[],
  outputRoot: string,
  siteUrl: string,
): Promise<ManifestEntry> => {
  const skillMdContent = readFileSync(
    join(skill.dir, 'SKILL.md'),
    'utf8',
  )
  const { description } = parseSkillFrontmatter(
    skillMdContent,
    skill.name,
  )

  if (files.length === 1) {
    return {
      name: skill.name,
      type: 'skill-md',
      description,
      url: `${siteUrl}/.well-known/agent-skills/${skill.name}/SKILL.md`,
      digest: computeDigest(Buffer.from(skillMdContent, 'utf8')),
    }
  }

  const archiveBytes = await buildArchive(skill, files)
  writeFileSync(
    join(outputRoot, `${skill.name}.tar.gz`),
    archiveBytes,
  )
  return {
    name: skill.name,
    type: 'archive',
    description,
    url: `${siteUrl}/.well-known/agent-skills/${skill.name}.tar.gz`,
    digest: computeDigest(archiveBytes),
  }
}

export const writeIndex = (
  outputRoot: string,
  entries: ManifestEntry[],
) => {
  const sorted = [...entries].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const manifest = { $schema: DISCOVERY_SCHEMA, skills: sorted }
  writeFileSync(
    join(outputRoot, 'index.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )
}
