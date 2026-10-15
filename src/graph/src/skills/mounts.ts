import {
  lstatSync,
  readdirSync,
  readlinkSync,
  rmdirSync,
  unlinkSync,
} from 'node:fs'
import type { Stats } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import {
  baseDepID,
  isDepID,
  joinDepIDTuple,
  splitDepID,
} from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { symlinkSyncMkdirp } from '../reify/symlink-sync.ts'
import type { Skill } from './discover.ts'

/**
 * A vlt link in the mount dir.
 */
export type SkillMount = {
  /** `/`-separated, relative to projectRoot */
  mount: string
  /** absolute link path */
  link: string
  /** absolute resolved link target */
  target: string
  /** DepID of the store dir the link points into */
  owner?: DepID
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

const norm = (p: string) => {
  const r = resolve(p)
  return process.platform === 'win32' ? r.toLowerCase() : r
}

/**
 * Same resolved path? Case-insensitive on win32.
 */
export const samePath = (a: string, b: string): boolean =>
  norm(a) === norm(b)

/**
 * Absolute path of a `/`-separated mount relative to projectRoot.
 */
export const mountPath = (
  projectRoot: string,
  mount: string,
): string => resolve(projectRoot, ...mount.split('/'))

const storeSeg = `${sep}node_modules${sep}.vlt${sep}`

/**
 * The target of `link` if it is a symlink (or junction) pointing into
 * a `node_modules/.vlt` store, otherwise undefined. Any store, not just
 * the project's: win32 junctions are absolute, so they point to the old
 * store after the project is moved or copied.
 */
export const mountTarget = (link: string): string | undefined => {
  if (!lstat(link)?.isSymbolicLink()) return undefined
  let raw = readlinkSync(link)
  if (raw.startsWith('\\\\?\\')) raw = raw.slice(4)
  const target = resolve(dirname(link), raw)
  return norm(target).includes(storeSeg) ? target : undefined
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

const isRealDir = (path: string) => !!lstat(path)?.isDirectory()

/**
 * All vlt links in `<dir>/`. Anything else is ignored.
 */
export const readMounts = (
  projectRoot: string,
  dir: string,
): SkillMount[] => {
  const root = resolve(projectRoot, dir)
  if (!isRealDir(root)) return []
  const mounts: SkillMount[] = []
  for (const e of readdirSync(root)) {
    const link = resolve(root, e)
    const target = mountTarget(link)
    if (target) {
      mounts.push({
        mount: `${dir}/${e}`,
        link,
        target,
        owner: ownerOf(target),
      })
    }
  }
  return mounts.sort((a, b) => a.mount.localeCompare(b.mount, 'en'))
}

/**
 * Link a skill at `<dir>/<skill>`. Never touches anything not managed by
 * vlt: returns `'conflict'` instead.
 */
export const mountSkill = (
  skill: Skill,
  projectRoot: string,
  dir: string,
): MountResult => {
  const link = mountPath(projectRoot, `${dir}/${skill.skill}`)
  // every component of dir must be a real dir, if present
  const parts = dir.split('/')
  for (let i = 1; i <= parts.length; i++) {
    const st = lstat(resolve(projectRoot, ...parts.slice(0, i)))
    if (st && !st.isDirectory()) return 'conflict'
  }
  if (lstat(link)) {
    const target = mountTarget(link)
    if (!target) return 'conflict'
    if (samePath(target, skill.path)) return 'unchanged'
    unlinkSync(link)
  }
  // junctions need no admin rights, but want an absolute target
  if (process.platform === 'win32') {
    symlinkSyncMkdirp(skill.path, link, 'junction')
  } else {
    symlinkSyncMkdirp(
      relative(dirname(link), skill.path),
      link,
      'dir',
    )
  }
  return 'linked'
}

// best-effort: not empty, gone, or busy (win32 cwd, AV lock)
const rmdirIfEmpty = (dir: string) => {
  try {
    rmdirSync(dir)
  } catch {}
}

/**
 * Remove a vlt link, plus `<dir>` if left empty.
 */
export const unmountSkill = (
  m: SkillMount,
  projectRoot: string,
  dir: string,
): void => {
  unlinkSync(m.link)
  rmdirIfEmpty(resolve(projectRoot, dir))
}
