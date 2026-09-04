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
 * only two artifact shapes the discovery RFC defines. Pure: the
 * archive bytes (when produced) are returned for the caller to write.
 */
export const buildManifestEntry = async (
  skill: Skill,
  files: string[],
  siteUrl: string,
): Promise<{ entry: ManifestEntry; archive?: Buffer }> => {
  const skillMdContent = readFileSync(
    join(skill.dir, 'SKILL.md'),
    'utf8',
  )
  const { description } = parseSkillFrontmatter(
    skillMdContent,
    skill.name,
  )

  const archive =
    files.length === 1 ? undefined : await buildArchive(skill, files)
  const bytes = archive ?? Buffer.from(skillMdContent, 'utf8')
  const base = `${siteUrl}/.well-known/agent-skills/${skill.name}`

  return {
    entry: {
      name: skill.name,
      type: archive ? 'archive' : 'skill-md',
      description,
      url: archive ? `${base}.tar.gz` : `${base}/SKILL.md`,
      digest: computeDigest(bytes),
    },
    archive,
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
