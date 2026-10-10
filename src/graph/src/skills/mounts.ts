import {
  lstatSync,
  readdirSync,
  readlinkSync,
  rmdirSync,
  unlinkSync,
} from 'node:fs'
import type { Stats } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { symlinkSyncMkdirp } from '../reify/symlink-sync.ts'
import type { Skill } from './discover.ts'

/**
 * A vlt-managed skill link found in `./skills`.
 */
export type SkillMount = {
  /** `/`-separated, relative to projectRoot */
  mount: string
  /** absolute link path */
  link: string
  /** package name from the path, e.g. `@s/bar` */
  name: string
  /** absolute resolved link target */
  target: string
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

const isRealDir = (path: string) => !!lstat(path)?.isDirectory()

/**
 * All vlt-managed links in `./skills/<pkg>/` (scoped:
 * `./skills/@scope/<pkg>/`). Anything else is ignored.
 */
export const readMounts = (projectRoot: string): SkillMount[] => {
  const root = resolve(projectRoot, 'skills')
  if (!isRealDir(root)) return []
  const containers: [string, string][] = []
  for (const e of readdirSync(root)) {
    const dir = resolve(root, e)
    if (!isRealDir(dir)) continue
    if (!e.startsWith('@')) {
      containers.push([e, dir])
      continue
    }
    for (const s of readdirSync(dir)) {
      const sdir = resolve(dir, s)
      if (isRealDir(sdir)) containers.push([`${e}/${s}`, sdir])
    }
  }
  const mounts: SkillMount[] = []
  for (const [name, dir] of containers) {
    // a user skill dir, never ours
    if (lstat(resolve(dir, 'SKILL.md'))) continue
    for (const e of readdirSync(dir)) {
      const link = resolve(dir, e)
      const target = mountTarget(link)
      if (target) {
        mounts.push({
          mount: `skills/${name}/${e}`,
          link,
          name,
          target,
        })
      }
    }
  }
  return mounts.sort((a, b) => a.mount.localeCompare(b.mount, 'en'))
}

/**
 * Link a skill at its mount path. Never touches anything not managed by
 * vlt: returns `'conflict'` instead.
 */
export const mountSkill = (
  skill: Skill,
  projectRoot: string,
): MountResult => {
  const link = mountPath(projectRoot, skill.mount)
  const container = dirname(link)
  // every parent dir up to the container must be a real dir, if present
  const parts = skill.mount.split('/').slice(0, -1)
  for (let i = 1; i <= parts.length; i++) {
    const st = lstat(resolve(projectRoot, ...parts.slice(0, i)))
    if (st && !st.isDirectory()) return 'conflict'
  }
  if (lstat(resolve(container, 'SKILL.md'))) return 'conflict'
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
    symlinkSyncMkdirp(relative(container, skill.path), link, 'dir')
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
 * Remove a managed link, plus any parent dirs it leaves empty.
 */
export const unmountSkill = (
  m: SkillMount,
  projectRoot: string,
): void => {
  unlinkSync(m.link)
  const container = dirname(m.link)
  rmdirIfEmpty(container)
  if (m.name.includes('/')) rmdirIfEmpty(dirname(container))
  rmdirIfEmpty(resolve(projectRoot, 'skills'))
}
