import {
  existsSync,
  lstatSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  unlinkSync,
} from 'node:fs'
import type { Stats } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import {
  baseDepID,
  isDepID,
  joinDepIDTuple,
  splitDepID,
} from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { symlinkSyncMkdirp } from '../reify/symlink-sync.ts'
import type { SkillsDir } from './dirs.ts'
import type { Skill } from './discover.ts'
import { gitignoreNames } from './gitignore.ts'

/**
 * A vlt link in an agent skills dir.
 */
export type SkillMount = {
  /** the dir holding the link */
  dir: SkillsDir
  /** entry name */
  name: string
  /** `<dir>/<name>`, `/`-separated, relative to projectRoot */
  mount: string
  /** absolute link path, in the real dir */
  link: string
  /** absolute resolved link target */
  target: string
  /** DepID of the store dir or workspace the link points into */
  owner?: DepID
}

/**
 * A workspace of the project.
 */
export type WorkspaceDir = {
  id: DepID
  /** realpath */
  path: string
}

/**
 * Outcome of mounting a single skill.
 */
export type MountResult = 'linked' | 'unchanged' | 'conflict'

/** `lstat`, undefined when missing or unreadable (eg, ENOTDIR) */
export const lstat = (path: string): Stats | undefined => {
  try {
    return lstatSync(path, { throwIfNoEntry: false })
  } catch {
    return undefined
  }
}

/** Resolved path, lowercased on win32. */
export const norm = (p: string): string => {
  const r = resolve(p)
  return process.platform === 'win32' ? r.toLowerCase() : r
}

/** realpath, else the resolved path when missing. */
export const realOr = (p: string): string => {
  try {
    return realpathSync(p)
  } catch {
    return resolve(p)
  }
}

/**
 * Same real path? Case-insensitive on win32.
 */
export const samePath = (a: string, b: string): boolean =>
  norm(realOr(a)) === norm(realOr(b))

const storeSeg = `${sep}node_modules${sep}.vlt${sep}`

// resolved target of a symlink (or junction)
const linkTarget = (link: string) => {
  if (!lstat(link)?.isSymbolicLink()) return undefined
  let raw = readlinkSync(link)
  if (raw.startsWith('\\\\?\\')) raw = raw.slice(4)
  return resolve(dirname(link), raw)
}

/**
 * The target of `link` if it is a symlink (or junction) pointing into
 * a `node_modules/.vlt` store, otherwise undefined. Any store, not just
 * the project's: win32 junctions are absolute, so they point to the old
 * store after the project is moved or copied.
 */
export const mountTarget = (link: string): string | undefined => {
  const target = linkTarget(link)
  return target && norm(target).includes(storeSeg) ?
      target
    : undefined
}

// the deepest workspace holding `target`
const workspaceOf = (target: string, workspaces: WorkspaceDir[]) => {
  const t = norm(realOr(target))
  return workspaces
    .filter(({ path }) => {
      const p = norm(path)
      return t === p || t.startsWith(p + sep)
    })
    .sort((a, b) => b.path.length - a.path.length)[0]
}

/**
 * The DepID of the last `node_modules/.vlt/<DepID>` segment of a raw
 * link target, if valid.
 */
export const ownerOf = (target: string): DepID | undefined => {
  const parts = target.split(sep)
  const seg = (i: number) =>
    process.platform === 'win32' ? parts[i]?.toLowerCase() : parts[i]
  for (let i = parts.length - 3; i >= 0; i--) {
    if (seg(i) === 'node_modules' && seg(i + 1) === '.vlt') {
      const id = parts[i + 2]
      return isDepID(id) ? id : undefined
    }
  }
  return undefined
}

/**
 * One key per package: registry + name, else the DepID w/o its extra.
 */
export const packageKey = (id: DepID): string => {
  const t = splitDepID(id)
  if (t[0] !== 'registry') return baseDepID(id)
  const spec = t[2]
  const at = spec.lastIndexOf('@')
  return joinDepIDTuple([
    'registry',
    t[1],
    at > 0 ? spec.slice(0, at) : spec,
  ])
}

/**
 * All vlt links in the given dirs: links into a `node_modules/.vlt`
 * store, and links listed in the dir's `.gitignore` block (or `made`)
 * into a workspace or dangling. Anything else is ignored.
 */
export const readMounts = (
  scan: SkillsDir[],
  {
    workspaces = [],
    made,
  }: { workspaces?: WorkspaceDir[]; made?: Set<string> } = {},
): SkillMount[] => {
  const mounts: SkillMount[] = []
  for (const dir of scan) {
    let entries: string[]
    try {
      entries = readdirSync(dir.real)
    } catch {
      continue
    }
    const listed = gitignoreNames(dir.real)
    for (const name of entries) {
      const link = join(dir.real, name)
      const mount = `${dir.dir}/${name}`
      const m = { dir, name, mount, link }
      const target = mountTarget(link)
      if (target) {
        mounts.push({ ...m, target, owner: ownerOf(target) })
        continue
      }
      const wsTarget =
        (listed.has(name) || made?.has(mount)) && linkTarget(link)
      if (!wsTarget) continue
      if (!existsSync(wsTarget)) {
        mounts.push({ ...m, target: wsTarget })
        continue
      }
      const ws = workspaceOf(wsTarget, workspaces)
      if (ws) mounts.push({ ...m, target: wsTarget, owner: ws.id })
    }
  }
  return mounts.sort((a, b) => a.mount.localeCompare(b.mount, 'en'))
}

/**
 * Link a skill at `<dir>/<skill>`. `'unchanged'` if the entry already
 * is the skill. Never touches anything not managed by vlt (a store
 * link, or `owned`): returns `'conflict'` instead.
 */
export const mountSkill = (
  skill: Pick<Skill, 'skill' | 'path'>,
  dir: SkillsDir,
  owned = false,
): MountResult => {
  const link = join(dir.real, skill.skill)
  if (lstat(link)) {
    if (samePath(link, skill.path)) return 'unchanged'
    if (!owned && !mountTarget(link)) return 'conflict'
    unlinkSync(link)
  }
  // junctions need no admin rights, but want an absolute target
  if (process.platform === 'win32') {
    symlinkSyncMkdirp(skill.path, link, 'junction')
  } else {
    symlinkSyncMkdirp(relative(dir.real, skill.path), link, 'dir')
  }
  return 'linked'
}

/**
 * Remove a vlt link. Its dir is kept.
 */
export const unmountSkill = (m: SkillMount): void => {
  unlinkSync(m.link)
}
