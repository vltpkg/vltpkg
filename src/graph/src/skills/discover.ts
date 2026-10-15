import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { splitDepID } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { parse } from '@vltpkg/semver'
import type { PathScurry } from 'path-scurry'
import type { Node } from '../node.ts'
import {
  lstat,
  mountPath,
  mountTarget,
  packageKey,
  samePath,
} from './mounts.ts'

/**
 * An agent skill (a dir with a `SKILL.md`) shipped by an installed
 * package. See https://agentskills.io/specification
 */
export type Skill = {
  /** package name, e.g. `@s/bar` */
  name: string
  /**
   * name a direct dep is installed under, when not `name`, as `vlt ls`
   * shows it
   */
  alias?: string
  /** package version */
  version?: string
  /** package DepID */
  id: DepID
  /** skill name: its `skills/<dir>` name, or the root SKILL.md `name` */
  skill: string
  /** frontmatter description (folded to one line, control chars stripped) */
  description?: string
  /** absolute path of the dir holding SKILL.md */
  path: string
  /** `/`-separated mount path relative to projectRoot: `skills/<skill>` */
  mount: string
  /** true when `mount` is a vlt link to `path` */
  linked: boolean
}

/**
 * Result of {@link discoverSkills}.
 */
export type DiscoveredSkills = {
  /** skills of the picked version of each package, sorted by mount */
  skills: Skill[]
  /** every scanned package version, w/ the skills it ships */
  scanned: Map<DepID, Pick<Skill, 'skill' | 'path'>[]>
}

/**
 * The `SKILL.md` frontmatter fields vlt reads.
 */
export type SkillFrontmatter = {
  name?: string
  description?: string
}

// safe single path segment, no dotfiles or scopes
const skillDirName = /^[a-z0-9][a-z0-9._-]*$/i
// agentskills.io `name`
const specName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const topKey = /^([A-Za-z0-9_-]+):/
const blockIndicator = /^[>|][-+1-9]*$/

const fold = (inline: string, more: string[]): string | undefined => {
  let value = [blockIndicator.test(inline) ? '' : inline, ...more]
    .filter(Boolean)
    .join(' ')
  const q = value[0]
  if (
    value.length > 1 &&
    (q === '"' || q === "'") &&
    value.endsWith(q)
  ) {
    value = value.slice(1, -1).trim()
  }
  return value || undefined
}

/**
 * Read `name` and `description` from a `SKILL.md` YAML frontmatter.
 * Minimal line reader: top-level keys, plain/quoted/folded values.
 */
export const readFrontmatter = (file: string): SkillFrontmatter => {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return {}
  }
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return {}
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (end === -1) return {}
  const fm: SkillFrontmatter = {}
  let key: keyof SkillFrontmatter | undefined
  let inline = ''
  let more: string[] = []
  const flush = () => {
    if (key) fm[key] = fold(inline, more)
    key = undefined
  }
  for (const line of lines.slice(1, end)) {
    if (!line.trim()) continue
    const m = topKey.exec(line)
    if (m) {
      flush()
      const k = m[1]
      if (k === 'name' || k === 'description') {
        key = k
        inline = line.slice(k.length + 1).trim()
        // drop a ` # comment` from unquoted values
        const hash = inline.search(/(?:^|\s)#/)
        if (hash !== -1 && !/^["']/.test(inline)) {
          inline = inline.slice(0, hash).trim()
        }
        more = []
      }
    } else if (/^\s/.test(line)) {
      if (key) more.push(line.trim())
    } else {
      flush()
    }
  }
  flush()
  return fm
}

// package-controlled text printed to terminals
const sanitize = (s?: string) => {
  const clean = s
    ?.replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return clean ? clean.slice(0, 1024) : undefined
}

type Found = {
  skill: string
  path: string
  description?: string
}

const lc = (s: string) => s.toLowerCase()
const isDir = (path: string) => !!lstat(path)?.isDirectory()
const isFile = (path: string) => !!lstat(path)?.isFile()
// `skills/SKILL.md` would make the dir look like a skill
const isSkillMd = (name: string) => name.toLowerCase() === 'skill.md'

const scan = (dir: string, pkgName: string): Found[] => {
  const found: Found[] = []
  const has = (skill: string) =>
    found.some(f => lc(f.skill) === lc(skill))
  const skillsDir = resolve(dir, 'skills')
  if (isDir(skillsDir)) {
    // one per name, any case
    for (const d of readdirSync(skillsDir).sort()) {
      if (!skillDirName.test(d) || isSkillMd(d) || has(d)) continue
      const path = resolve(skillsDir, d)
      const file = resolve(path, 'SKILL.md')
      if (!isDir(path) || !isFile(file)) continue
      const { description } = readFrontmatter(file)
      found.push({ skill: d, path, description })
    }
  }
  const root = resolve(dir, 'SKILL.md')
  if (isFile(root)) {
    const { name, description } = readFrontmatter(root)
    const skill =
      name && name.length <= 64 && specName.test(name) ?
        name
      : pkgName.slice(pkgName.lastIndexOf('/') + 1)
    if (
      skillDirName.test(skill) &&
      !isSkillMd(skill) &&
      !has(skill)
    ) {
      found.push({ skill, path: dir, description })
    }
  }
  return found
}

// 0: dep of the main importer, 1: of any importer, 2: transitive
const rank = (node: Node) => {
  let r = 2
  for (const { from } of node.edgesIn) {
    if (from.mainImporter) return 0
    if (from.importer) r = 1
  }
  return r
}

const ver = (node: Node) =>
  node.version ? parse(node.version) : undefined

// higher version first, if both valid
const byVersion = (a: Node, b: Node) => {
  const va = ver(a)
  const vb = ver(b)
  return va && vb ? vb.compare(va) : 0
}

const compare = (a: Node, b: Node) =>
  rank(a) - rank(b) ||
  byVersion(a, b) ||
  a.id.localeCompare(b.id, 'en')

// the name a direct dep is installed under, if not its own
const aliasOf = (node: Node) => {
  const edges = [...node.edgesIn]
  const n = (
    edges.find(e => e.from.mainImporter) ??
    edges.find(e => e.from.importer)
  )?.name
  return n === node.name ? undefined : n
}

/**
 * Find the agent skills shipped by the given installed packages.
 *
 * Only packages in the vlt store are scanned, for skills at
 * `skills/<dir>/SKILL.md` and a root `SKILL.md`. One version per
 * package is picked, even if it ships none: a dep of the main
 * importer, else of any importer, else the highest version, then
 * DepID. Same-name skills of different packages are all returned,
 * sorted by rank then DepID (`linkSkills` resolves them).
 */
export const discoverSkills = (
  nodes: Iterable<Node>,
  scurry: PathScurry,
  projectRoot: string,
  dir: string,
): DiscoveredSkills => {
  const scanned: DiscoveredSkills['scanned'] = new Map()
  const byPkg = new Map<string, { node: Node; found: Found[] }[]>()
  for (const node of nodes) {
    if (
      node.importer ||
      !node.inVltStore() ||
      // lockfile keeps a tarball's path as its location
      splitDepID(node.id)[0] === 'file'
    ) {
      continue
    }
    const found = scan(node.resolvedLocation(scurry), node.name)
    scanned.set(
      node.id,
      found.map(({ skill, path }) => ({ skill, path })),
    )
    const key = packageKey(node.id)
    const list = byPkg.get(key) ?? []
    list.push({ node, found })
    byPkg.set(key, list)
  }
  const rows: [Skill, number][] = []
  for (const list of byPkg.values()) {
    const { node, found } = list.reduce((a, b) =>
      compare(a.node, b.node) <= 0 ? a : b,
    )
    for (const { skill, path, description } of found) {
      const mount = `${dir}/${skill}`
      const target = mountTarget(mountPath(projectRoot, mount))
      rows.push([
        {
          name: node.name,
          alias: aliasOf(node),
          version: node.version,
          id: node.id,
          skill,
          description: sanitize(description),
          path,
          mount,
          linked: !!target && samePath(target, path),
        },
        rank(node),
      ])
    }
  }
  const skills = rows
    .sort(
      ([a, ra], [b, rb]) =>
        lc(a.mount).localeCompare(lc(b.mount), 'en') ||
        ra - rb ||
        a.id.localeCompare(b.id, 'en'),
    )
    .map(([s]) => s)
  return { skills, scanned }
}
