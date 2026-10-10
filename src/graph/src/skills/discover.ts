import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { splitDepID } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { parse } from '@vltpkg/semver'
import { isPathSafeName } from '@vltpkg/spec'
import type { PathScurry } from 'path-scurry'
import type { Node } from '../node.ts'
import { lstat, mountPath, mountTarget, samePath } from './mounts.ts'

/**
 * An agent skill (a dir with a `SKILL.md`) shipped by an installed
 * package. See https://agentskills.io/specification
 */
export type Skill = {
  /** package name, e.g. `@s/bar` */
  name: string
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
  /** `/`-separated mount path relative to projectRoot: `skills/<name>/<skill>` */
  mount: string
  /** true when `mount` is a vlt link to `path` */
  linked: boolean
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

const isDir = (path: string) => !!lstat(path)?.isDirectory()
const isFile = (path: string) => !!lstat(path)?.isFile()
// its container would look like a user skill dir
const isSkillMd = (name: string) => name.toLowerCase() === 'skill.md'

const scan = (dir: string, pkgName: string): Found[] => {
  const found: Found[] = []
  const skillsDir = resolve(dir, 'skills')
  if (isDir(skillsDir)) {
    for (const d of readdirSync(skillsDir)) {
      if (!skillDirName.test(d) || isSkillMd(d)) continue
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
    const lc = skill.toLowerCase()
    if (
      !isSkillMd(skill) &&
      !found.some(f => f.skill.toLowerCase() === lc)
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

/**
 * Find the agent skills shipped by the given installed packages.
 *
 * Only packages in the vlt store are scanned, for skills at
 * `skills/<dir>/SKILL.md` and a root `SKILL.md`. When multiple
 * versions of a package ship skills, one is picked: a dep of the main
 * importer, else of any importer, else the highest version.
 */
export const discoverSkills = (
  nodes: Iterable<Node>,
  scurry: PathScurry,
  projectRoot: string,
): Skill[] => {
  const byName = new Map<string, { node: Node; found: Found[] }[]>()
  for (const node of nodes) {
    const { name } = node
    if (
      node.importer ||
      !node.inVltStore() ||
      // lockfile keeps a tarball's path as its location
      splitDepID(node.id)[0] === 'file' ||
      !isPathSafeName(name) ||
      // `@x` would read as a scope dir
      /^@[^/]*$/.test(name)
    ) {
      continue
    }
    const found = scan(node.resolvedLocation(scurry), name)
    if (!found.length) continue
    const list = byName.get(name) ?? []
    list.push({ node, found })
    byName.set(name, list)
  }
  const skills: Skill[] = []
  for (const [name, list] of byName) {
    const { node, found } = list.reduce((a, b) =>
      compare(a.node, b.node) <= 0 ? a : b,
    )
    for (const { skill, path, description } of found) {
      const mount = `skills/${name}/${skill}`
      const target = mountTarget(mountPath(projectRoot, mount))
      skills.push({
        name,
        version: node.version,
        id: node.id,
        skill,
        description: sanitize(description),
        path,
        mount,
        linked: !!target && samePath(target, path),
      })
    }
  }
  // one mount per path on case-insensitive filesystems
  const seen = new Set<string>()
  return skills
    .sort((a, b) => a.mount.localeCompare(b.mount, 'en'))
    .filter(({ mount }) => {
      const k = mount.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
}
