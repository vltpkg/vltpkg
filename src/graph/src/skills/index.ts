import { existsSync } from 'node:fs'
import type { DepID } from '@vltpkg/dep-id'
import type { PathScurry } from 'path-scurry'
import { load as loadActual } from '../actual/load.ts'
import type { LoadOptions } from '../actual/load.ts'
import { filterNodesByQueryParts } from '../filter-nodes-by-query.ts'
import type {
  QueryPartIds,
  Unscanned,
} from '../filter-nodes-by-query.ts'
import type { Graph } from '../graph.ts'
import { unshare } from '../reify/unshare.ts'
import { skillsDirs } from './dirs.ts'
import type { SkillsDir } from './dirs.ts'
import { discoverSkills } from './discover.ts'
import type { Skill } from './discover.ts'
import { editGitignore } from './gitignore.ts'
import { maskSkills } from './mask.ts'
import type { UnmatchedPattern } from './mask.ts'
import {
  mountSkill,
  packageKey,
  readMounts,
  samePath,
  unmountSkill,
} from './mounts.ts'
import type { SkillMount } from './mounts.ts'

export * from './discover.ts'
export type { SkillMount, MountResult } from './mounts.ts'
export type { SkillsDir } from './dirs.ts'
export type { UnmatchedPattern } from './mask.ts'

/**
 * Options for {@link listSkills} and {@link linkSkills}.
 */
export type SkillsOptions = LoadOptions & {
  /**
   * DSS query selecting packages, selectors may end with `:skill()`;
   * default `*`
   */
  target?: string
  /** graph to use instead of loading the actual one */
  graph?: Graph
  /**
   * agent skill dirs, relative to projectRoot. Unset: detect; `[]`:
   * none
   */
  skillsDirs?: string[]
  /** env read by detection; default `process.env` */
  env?: Record<string, string | undefined>
}

/**
 * Options for {@link linkSkills}.
 */
export type LinkSkillsOptions = SkillsOptions & {
  /** DSS query selecting packages */
  target: string
  /**
   * also remove every vlt link this selection does not make, in every
   * scanned dir (`vlt skills link`). Default: only add links and remove
   * links whose skill is gone (installs)
   */
  apply?: boolean
}

/**
 * A skill linked in one dir.
 */
export type SkillRow = Skill & {
  /** the dir */
  dir: string
  /** `<dir>/<skill>` */
  mount: string
}

/**
 * Skills left out as their packages have no security data (fail
 * closed).
 */
export type UnscannedSkills = {
  /** `<skill> (<package>)` */
  unscanned?: string[]
  /** why: the request timed out, or socket.dev has not scanned them */
  unscannedReason?: 'timeout' | 'unscanned'
}

/**
 * Result of {@link listSkills}.
 */
export type ListSkillsResult = UnscannedSkills & {
  skills: Skill[]
  /** target dirs */
  dirs: string[]
  /** targets dropped: `<dir> (<reason>)` */
  skipped?: string[]
}

/**
 * Result of {@link linkSkills}.
 */
export type LinkSkillsResult = UnscannedSkills & {
  /** links created or re-pointed */
  linked: SkillRow[]
  /** selected skills already linked */
  unchanged: SkillRow[]
  /**
   * vlt links removed (skill gone, or with `apply`: not selected or dir
   * no longer a target): `/`-separated relative paths
   */
  removed: string[]
  /**
   * skipped per dir: path in use (`<mount>`), or name taken by another
   * package (`<mount> (<package>)`)
   */
  conflicts: string[]
  /** target dirs */
  dirs: string[]
  /** targets dropped: `<dir> (<reason>)` */
  skipped?: string[]
  /** `<dir>/.gitignore` files not updated: not a regular file, fs error */
  gitignore?: string[]
  /** `:skill()` patterns that matched no skill of their packages */
  unmatched?: UnmatchedPattern[]
}

const lc = (s: string) => s.toLowerCase()

const selectNodes = async (o: SkillsOptions) => {
  const graph = o.graph ?? loadActual({ ...o, loadManifests: true })
  const { ids, parts, unscanned } = await filterNodesByQueryParts(
    graph,
    o.target ?? '*',
  )
  const nodes = [...graph.nodes.values()].filter(n => ids.has(n.id))
  return { graph, nodes, parts, unscanned }
}

const dirsOf = (o: SkillsOptions, create = false) =>
  skillsDirs({
    projectRoot: o.projectRoot,
    configured: o.skillsDirs,
    env: o.env,
    create,
  })

// packages behind live vlt links
const liveOwners = (mounts: SkillMount[]): DepID[] =>
  mounts.flatMap(m =>
    m.owner && existsSync(m.target) ? [m.owner] : [],
  )

// private copies of store-hardlinked files: edits via skill links
// must not reach the global store
const unshareSkills = async (
  graph: Graph,
  ids: Iterable<DepID>,
  scurry: PathScurry,
) => {
  for (const id of new Set(ids)) {
    const node = graph.nodes.get(id)
    if (node?.inVltStore())
      await unshare(node.resolvedLocation(scurry))
  }
}

// `vlt ls` style
const label = (s: Skill) => {
  const pkg = s.version ? `${s.name}@${s.version}` : s.name
  return s.alias ? `${s.alias} (${pkg})` : pkg
}

// apply the mask; fail closed: skills of `unscanned` pkgs are dropped,
// and reported unless another package's skill takes the name
const pick = (
  found: Skill[],
  parts: QueryPartIds[],
  unscanned?: Unscanned,
) => {
  const { skills: masked, unmatched } = maskSkills(found, parts)
  const ok = (s: Skill) => !unscanned?.ids.has(s.id)
  const picked = masked.filter(ok)
  const names = new Set(picked.map(s => lc(s.skill)))
  const dropped = masked.filter(
    s => !ok(s) && !names.has(lc(s.skill)),
  )
  return { skills: found.filter(ok), picked, unmatched, dropped }
}

const report = (
  dropped: Skill[],
  unscanned?: Unscanned,
): UnscannedSkills =>
  unscanned && dropped.length ?
    {
      unscanned: dropped.map(s => `${s.skill} (${label(s)})`),
      unscannedReason: unscanned.reason,
    }
  : {}

/**
 * List the agent skills shipped by installed packages (`:skill()`
 * applied, `unscanned` left out), and the agent skill dirs. Creates
 * nothing.
 */
export const listSkills = async (
  o: SkillsOptions,
): Promise<ListSkillsResult> => {
  const { nodes, parts, unscanned } = await selectNodes(o)
  const { targets, scan, skipped } = dirsOf(o)
  const { skills } = discoverSkills(nodes, o.scurry, readMounts(scan))
  const { picked, dropped } = pick(skills, parts, unscanned)
  return {
    skills: picked,
    dirs: targets.map(d => d.dir),
    ...(skipped.length ? { skipped } : null),
    ...report(dropped, unscanned),
  }
}

/**
 * Link the agent skills of the selected packages into each of the
 * project's agent skill dirs (see `skillsDirs`), created only when a
 * skill is picked. `target` selectors may end with `:skill()`. One
 * package per name, among picked skills, in every dir: the package of
 * the first existing link (in dir order), else rank (main importer
 * dep, importer dep, transitive), then DepID; the others are
 * reported. Installs keep a dir's link to another installed skill.
 * A link follows its package to the picked version, in every scanned
 * dir. Then remove vlt links whose skill is no longer installed (with
 * `apply`: every vlt link not made here), and keep each dir's
 * `.gitignore` block in sync. Linked packages get private copies of
 * files hardlinked from the global store. Security queries fail
 * closed: skills of packages with no security data are not linked,
 * and reported in `unscanned` unless still linked.
 */
export const linkSkills = async (
  o: LinkSkillsOptions,
): Promise<LinkSkillsResult> => {
  const { graph, nodes, parts, unscanned } = await selectNodes(o)
  const { skills: found, scanned } = discoverSkills(nodes, o.scurry)
  const { skills, picked, unmatched, dropped } = pick(
    found,
    parts,
    unscanned,
  )
  const inMask = new Set(picked)
  const { targets, scan, skipped } = dirsOf(o, picked.length > 0)
  const res: LinkSkillsResult = {
    linked: [],
    unchanged: [],
    removed: [],
    conflicts: [],
    dirs: targets.map(d => d.dir),
  }
  const mounts = readMounts(scan)
  const byName = new Map(
    mounts.map(m => [`${m.dir.dir}\0${lc(m.name)}`, m]),
  )
  // the link's skill is no longer installed: dangling, orphan owner,
  // or a scanned owner that no longer ships it
  const stale = (m: SkillMount) =>
    !m.owner ||
    !graph.nodes.has(m.owner) ||
    !existsSync(m.target) ||
    scanned
      .get(m.owner)
      ?.some(
        f => lc(f.skill) === lc(m.name) && samePath(f.path, m.target),
      ) === false
  const groups = new Map<string, Skill[]>()
  for (const s of skills) {
    const k = lc(s.skill)
    groups.set(k, [...(groups.get(k) ?? []), s])
  }
  // the link at `<dir>/<k>`, and its package's skill in `group`
  const at = (dir: SkillsDir, k: string, group: Skill[]) => {
    const m = byName.get(`${dir.dir}\0${k}`)
    const key = m?.owner && packageKey(m.owner)
    return { m, own: group.find(s => packageKey(s.id) === key) }
  }
  // picked skills only: the others never take a name
  const cands = (group: Skill[]) => group.filter(s => inMask.has(s))
  // one per name: the first linked package keeps it, re-pointed if needed
  const first = new Map(
    [...groups].map(([k, group]) => {
      const c = cands(group)
      return [
        k,
        targets.map(d => at(d, k, c).own).find(s => !!s) ?? c[0],
      ]
    }),
  )
  const isTarget = new Set(targets)
  const picks: {
    dir: SkillsDir
    winner?: Skill
    losers: Skill[]
    m?: SkillMount
  }[] = []
  for (const dir of scan) {
    for (const [k, group] of groups) {
      const { m, own } = at(dir, k, group)
      if (isTarget.has(dir)) {
        // installs keep a link to another installed skill
        const winner =
          o.apply ?
            first.get(k)
          : (own ?? (m && !stale(m) ? undefined : first.get(k)))
        picks.push({
          dir,
          winner,
          losers: cands(group).filter(s => s !== winner),
          m,
        })
      } else if (own && !o.apply) {
        // no longer a target: only re-pointed
        picks.push({ dir, winner: own, losers: [], m })
      }
    }
  }
  await unshareSkills(
    graph,
    [
      ...picks.flatMap(({ winner }) => (winner ? [winner.id] : [])),
      ...liveOwners(mounts),
    ],
    o.scurry,
  )
  const gone: SkillMount[] = []
  // names taken over by entries not vlt's
  const foreign: { dir: SkillsDir; name: string }[] = []
  const kept = new Set<string>()
  const where = new Map<string, string[]>()
  for (const { dir, winner, losers, m } of picks) {
    if (winner) {
      // replaced link named in another case (case-sensitive fs)
      if (m && m.name !== winner.skill) {
        unmountSkill(m)
        gone.push(m)
      }
      const mount = `${dir.dir}/${winner.skill}`
      const r = mountSkill(winner, dir)
      if (r === 'conflict') {
        res.conflicts.push(mount)
        foreign.push({ dir, name: winner.skill })
      } else {
        const k = `${winner.id}\0${winner.skill}`
        const linked = where.get(k) ?? []
        linked.push(dir.dir)
        where.set(k, linked)
        res[r].push({ ...winner, linked, dir: dir.dir, mount })
        kept.add(mount)
      }
    }
    for (const s of losers)
      res.conflicts.push(`${dir.dir}/${s.skill} (${label(s)})`)
  }
  const after = readMounts(scan)
  const present: SkillMount[] = []
  for (const m of after) {
    if (o.apply ? kept.has(m.mount) : !stale(m)) {
      present.push(m)
      continue
    }
    unmountSkill(m)
    gone.push(m)
    res.removed.push(m.mount)
  }
  const gitignore: string[] = []
  for (const dir of scan) {
    const add = present.filter(m => m.dir === dir).map(m => m.name)
    const remove = [...gone, ...foreign]
      .filter(m => m.dir === dir && !add.includes(m.name))
      .map(m => m.name)
    if (
      (add.length || remove.length) &&
      editGitignore(dir.real, { add, remove }) === 'refused'
    ) {
      gitignore.push(`${dir.dir}/.gitignore`)
    }
  }
  if (skipped.length) res.skipped = skipped
  if (gitignore.length) res.gitignore = gitignore
  if (unmatched.length) res.unmatched = unmatched
  // not left out: still linked in every dir (installs keep links)
  const left = dropped.filter(
    s =>
      !targets.every(d =>
        present.some(
          m =>
            m.dir === d &&
            m.owner === s.id &&
            lc(m.name) === lc(s.skill),
        ),
      ),
  )
  return Object.assign(res, report(left, unscanned))
}
