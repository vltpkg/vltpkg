import type { WhichConfig } from '@vltpkg/vlt-json'
import { configWriteTarget } from './config/index.ts'
import type { LoadedConfig } from './config/index.ts'

/** A config key holding a DSS query that opts packages in. */
export type AllowKey = 'allow-skills' | 'allow-scripts'

/** An allow query stored in a config file. */
export type StoredAllow = { query: string; which: WhichConfig }

/**
 * Outcome of saving an explicit allow query after install/update.
 * `stored` set: another query is stored and was kept.
 */
export type AllowSave = {
  query: string
  stored?: StoredAllow
}

// the command that sets each key
const setBy: Record<AllowKey, string> = {
  'allow-skills': 'vlt skills link',
  'allow-scripts': 'vlt build',
}

/**
 * The top-level `key` of the project vlt.json, else the user one. A
 * project `null` or `''` drops the user's.
 */
export const storedAllow = (
  conf: Pick<LoadedConfig, 'layers'>,
  key: AllowKey,
): StoredAllow | undefined => {
  const { project, user } = conf.layers
  const p = project?.[key]
  if (p) return { query: p, which: 'project' }
  if (project && key in project) return undefined
  const u = user?.[key]
  return u ? { query: u, which: 'user' } : undefined
}

/** The file's name in messages. */
export const configLabel = (which: WhichConfig): string =>
  which === 'user' ? 'user vlt.json' : 'vlt.json'

/**
 * After a successful install/update: save an explicit `key` to the
 * project vlt.json, unless another query is stored.
 */
export const saveAllow = async (
  conf: LoadedConfig,
  key: AllowKey,
): Promise<AllowSave | undefined> => {
  const query = conf.explicit[key]
  if (!query || query === ':not(*)') return undefined
  const stored = storedAllow(conf, key)
  if (stored?.query === query) return undefined
  if (stored) return { query, stored }
  await conf.addConfigToFile('project', { [key]: query })
  return { query }
}

/** Save `key` to the project vlt.json, or the user one w/ --config=user. */
export const writeAllow = async (
  conf: LoadedConfig,
  key: AllowKey,
  query: string,
): Promise<WhichConfig> => {
  const which = configWriteTarget(conf, 'project')
  await conf.addConfigToFile(which, { [key]: query })
  return which
}

/** `key` saved to a config file. */
export const savedLine = (
  key: AllowKey,
  query: string,
  which: WhichConfig,
): string => `Saved ${key}="${query}" to ${configLabel(which)}`

/** An explicit `key` not saved: another query is stored. */
export const keptLine = (key: AllowKey, s: StoredAllow): string =>
  `${key} is already set (${configLabel(s.which)}): "${s.query}"; not replaced. Run ${setBy[key]} to change it, or edit ${configLabel(s.which)}`
