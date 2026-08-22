/**
 * Publish source-level agent skills to the docs site's `.well-known`.
 *
 * Discovery and packaging logic lives in `@vltpkg/skills` (`src/skills`);
 * this script just wires it up with this site's paths and its
 * astro-config-derived `siteUrl`.
 *
 * Usage: vlt run sync-skills
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { syncAgentSkills } from '@vltpkg/skills'

/** Fallback if `site` can't be read out of astro.config.mts. */
export const DEFAULT_SITE_URL = 'https://docs.vlt.io'

/** Best-effort extraction of astro.config.mts's `site:` value. */
export const readSiteUrl = (configPath: string): string => {
  if (!existsSync(configPath)) return DEFAULT_SITE_URL
  const match = /site:\s*['"]([^'"]+)['"]/.exec(
    readFileSync(configPath, 'utf8'),
  )
  return match?.[1] ?? DEFAULT_SITE_URL
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  const srcRoot = resolve(
    fileURLToPath(import.meta.url),
    '../../../../src',
  )
  const outputRoot = resolve(
    fileURLToPath(import.meta.url),
    '../../public/.well-known/agent-skills',
  )
  const siteUrl = readSiteUrl(
    resolve(fileURLToPath(import.meta.url), '../../astro.config.mts'),
  )
  const { skillCount, fileCount, archiveCount } =
    await syncAgentSkills(srcRoot, outputRoot, siteUrl)
  console.log(
    `sync-agent-skills: ${skillCount} skill(s), ${fileCount} file(s), ${archiveCount} archive(s)`,
  )
}
