import type { UnmatchedPattern } from '@vltpkg/graph'
import type { WhichConfig } from '@vltpkg/vlt-json'
import type { LoadedConfig } from './config/index.ts'

/** An `allow-skills` query stored in a config file. */
export type StoredAllowSkills = { query: string; which: WhichConfig }

/**
 * Outcome of saving `--allow-skills` after install/update. `stored`
 * set: another query is stored and was kept.
 */
export type AllowSkillsSave = {
  query: string
  stored?: StoredAllowSkills
}

/**
 * The top-level `allow-skills` of the project vlt.json, else the user
 * one. A project `null` or `''` drops the user's.
 */
export const storedAllowSkills = (
  conf: Pick<LoadedConfig, 'layers'>,
): StoredAllowSkills | undefined => {
  const { project, user } = conf.layers
  const p = project?.['allow-skills']
  if (p) return { query: p, which: 'project' }
  if (project && 'allow-skills' in project) return undefined
  const u = user?.['allow-skills']
  return u ? { query: u, which: 'user' } : undefined
}

/** The file's name in messages. */
export const configLabel = (which: WhichConfig): string =>
  which === 'user' ? 'user vlt.json' : 'vlt.json'

/**
 * After a successful install/update: save an explicit `--allow-skills`
 * to the project vlt.json, unless another query is stored.
 */
export const saveAllowSkills = async (
  conf: LoadedConfig,
): Promise<AllowSkillsSave | undefined> => {
  const query = conf.explicit['allow-skills']
  if (!query || query === ':not(*)') return undefined
  const stored = storedAllowSkills(conf)
  if (stored?.query === query) return undefined
  if (stored) return { query, stored }
  await conf.addConfigToFile('project', { 'allow-skills': query })
  return { query }
}

/** Warnings for `:skill()` patterns that matched nothing. */
export const unmatchedLines = (
  unmatched: UnmatchedPattern[] = [],
): string[] =>
  unmatched.map(
    ({ pattern, skills }) =>
      `⚠️ No skill matches "${pattern}"; ${
        skills.length ?
          `the selected packages ship: ${skills.join(', ')}`
        : 'the selected packages ship no skills'
      }`,
  )

/** `allow-skills` saved to a config file. */
export const savedLine = (
  query: string,
  which: WhichConfig,
): string => `Saved allow-skills="${query}" to ${configLabel(which)}`

/** `--allow-skills` not saved: another query is stored. */
export const keptLine = (s: StoredAllowSkills): string =>
  `allow-skills is already set (${configLabel(s.which)}): "${s.query}"; not replaced. Run vlt skills link to change it, or edit ${configLabel(s.which)}`
