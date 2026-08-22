/**
 * Publish source-level agent skills to the docs site's `.well-known`.
 *
 * Every `src/<workspace>/skills/<name>/` directory in the repo (each
 * holding a `SKILL.md`) is copied to
 * `www/docs/public/.well-known/agent-skills/<name>/`, so it's
 * fetchable the same way the hand-authored `markdown-negotiation`
 * skill is. The file set for a skill is discovered by following
 * relative markdown links starting from `SKILL.md`, so files that
 * aren't linked (e.g. an internal `evals/` grading folder) are never
 * published.
 *
 * Output directories are tagged with a `.generated` sentinel and
 * fully rebuilt on each run, so removed files and removed skills
 * don't linger. Hand-authored directories (no sentinel) are never
 * touched.
 *
 * On top of the loose per-skill files, this also generates a
 * `.well-known/agent-skills/index.json` discovery manifest per the
 * agent-skills-discovery RFC (https://github.com/cloudflare/agent-skills-discovery-rfc):
 * single-file skills are listed as `type: "skill-md"` pointing directly
 * at `SKILL.md`; skills with supporting files (e.g. `dss-query`'s
 * `REFERENCE.md`) are bundled into a `<name>.tar.gz` and listed as
 * `type: "archive"`, since the RFC only defines those two artifact
 * shapes. Every entry carries a SHA-256 `digest`. Hand-authored skill
 * directories are picked up read-only and included in the index too,
 * without the sync script ever writing into them.
 *
 * Usage: vlt run sync-skills
 */

import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { create as tarCreate } from 'tar'
import { parse as parseYaml } from 'yaml'

/** Schema version for the discovery manifest we emit. */
const DISCOVERY_SCHEMA =
  'https://schemas.agentskills.io/discovery/0.2.0/schema.json'

/** Fallback if `site` can't be read out of astro.config.mts. */
const DEFAULT_SITE_URL = 'https://docs.vlt.io'

export type Skill = {
  name: string
  dir: string
}

export type ManifestEntry = {
  name: string
  type: 'skill-md' | 'archive'
  description: string
  url: string
  digest: string
}

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

/** Matches `[label](target)`, capturing the raw target (and any title). */
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g

/**
 * Follow relative markdown links from `SKILL.md` to find every file
 * the skill actually needs, recursing into linked `.md` files. Paths
 * are relative to `skill.dir`.
 */
export const resolveSkillFiles = (skill: Skill): string[] => {
  const visited = new Set<string>()
  const queue: string[] = ['SKILL.md']

  let rel: string | undefined
  while ((rel = queue.shift()) !== undefined) {
    if (visited.has(rel)) continue
    visited.add(rel)
    if (!rel.endsWith('.md')) continue

    const abs = join(skill.dir, rel)
    if (!existsSync(abs)) {
      throw new Error(`${skill.name}: linked file not found: ${rel}`)
    }
    const content = readFileSync(abs, 'utf8')

    for (const match of content.matchAll(LINK_RE)) {
      const target = match[1].trim().split(/\s+/)[0]
      if (target === '') continue
      if (target.startsWith('#')) continue
      if (/^https?:\/\//i.test(target)) continue

      const pathPart = target.split('#')[0]
      if (!pathPart) continue

      const resolvedAbs = resolve(dirname(abs), pathPart)
      const relFromSkillRoot = relative(skill.dir, resolvedAbs)
      if (
        relFromSkillRoot.startsWith('..') ||
        isAbsolute(relFromSkillRoot)
      ) {
        throw new Error(
          `${skill.name}: link in ${rel} escapes the skill directory: ${target}`,
        )
      }
      queue.push(relFromSkillRoot)
    }
  }

  return [...visited]
}

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

/** Parse the `---...---` YAML frontmatter block of a SKILL.md file. */
export const parseSkillFrontmatter = (
  content: string,
  skillName: string,
): { name: string; description: string } => {
  const match = /^---\n([\s\S]*?)\n---/.exec(content)
  if (!match) {
    throw new Error(`${skillName}: SKILL.md has no frontmatter block`)
  }
  const parsed: unknown = parseYaml(match[1])
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`${skillName}: SKILL.md frontmatter is not a map`)
  }
  const { name, description } = parsed as Record<string, unknown>
  if (typeof name !== 'string' || name === '') {
    throw new Error(
      `${skillName}: SKILL.md frontmatter is missing "name"`,
    )
  }
  if (typeof description !== 'string' || description === '') {
    throw new Error(
      `${skillName}: SKILL.md frontmatter is missing "description"`,
    )
  }
  return { name, description }
}

export const computeDigest = (bytes: Buffer): string =>
  `sha256:${createHash('sha256').update(bytes).digest('hex')}`

/**
 * Bundle `files` (already validated by `resolveSkillFiles`, so never
 * escape `skill.dir`) into an in-memory gzipped tarball, the same
 * `tar.create(...).concat()` pattern `packTarball` uses in
 * `src/cli-sdk/src/pack-tarball.ts`.
 */
export const buildArchive = (
  skill: Skill,
  files: string[],
): Promise<Buffer> =>
  tarCreate({ cwd: skill.dir, gzip: true }, files).concat()

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

/** Remove previously-generated archives and manifest, always rebuilt fresh. */
const cleanManifestArtifacts = (outputRoot: string) => {
  if (!existsSync(outputRoot)) return
  for (const name of readdirSync(outputRoot)) {
    if (name.endsWith('.tar.gz') || name === 'index.json') {
      rmSync(join(outputRoot, name))
    }
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
  siteUrl: string = DEFAULT_SITE_URL,
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

  const entries: ManifestEntry[] = []
  let archiveCount = 0
  for (const skill of allSkills) {
    const files =
      resolvedFiles.get(skill.name) ?? resolveSkillFiles(skill)
    const entry = await buildManifestEntry(
      skill,
      files,
      outputRoot,
      siteUrl,
    )
    if (entry.type === 'archive') archiveCount++
    entries.push(entry)
  }
  writeIndex(outputRoot, entries)

  return { skillCount: skills.length, fileCount, archiveCount }
}

/** Best-effort extraction of astro.config.mts's `site:` value. */
const readSiteUrl = (configPath: string): string => {
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
