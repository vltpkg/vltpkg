import { existsSync } from 'node:fs'
import { basename } from 'node:path'
import type { DepID } from '@vltpkg/dep-id'
import type { PathScurry } from 'path-scurry'
import { load as loadActual } from '../actual/load.ts'
import type { LoadOptions } from '../actual/load.ts'
import { filterNodesByQuery } from '../filter-nodes-by-query.ts'
import type { Graph } from '../graph.ts'
import { unshare } from '../reify/unshare.ts'
import { discoverSkills } from './discover.ts'
import type { Skill } from './discover.ts'
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

/**
 * Options for {@link listSkills}, {@link linkSkills} and
 * {@link unlinkSkills}.
 */
export type SkillsOptions = LoadOptions & {
  /** DSS query selecting packages; default `*` */
  target?: string
  /** graph to use instead of loading the actual one */
  graph?: Graph
}

/**
 * Options for {@link linkSkills}.
 */
export type LinkSkillsOptions = SkillsOptions & {
  /** DSS query selecting packages */
  target: string
}

/**
 * Result of {@link linkSkills}.
 */
export type LinkSkillsResult = {
  /** mounts created or re-pointed */
  linked: Skill[]
  /** selected skills already linked */
  unchanged: Skill[]
  /**
   * vlt links whose skill is no longer installed, removed:
   * `/`-separated relative paths
   */
  removed: string[]
  /**
   * skipped: path in use (`<mount>`), or name taken by another package
   * (`<mount> (<package>)`)
   */
  conflicts: string[]
}

/**
 * Result of {@link unlinkSkills}.
 */
export type UnlinkSkillsResult = {
  /** mounts removed, `/`-separated relative paths */
  removed: string[]
}

/**
 * Options for {@link syncSkills}.
 */
export type SyncSkillsOptions = SkillsOptions & {
  graph: Graph
  /** DSS query: packages whose skills get linked */
  allowSkills?: string
}

const dir = 'skills'
const lc = (s: string) => s.toLowerCase()

const selectNodes = async (o: SkillsOptions) => {
  const graph = o.graph ?? loadActual({ ...o, loadManifests: true })
  const ids = await filterNodesByQuery(graph, o.target ?? '*')
  const nodes = [...graph.nodes.values()].filter(n => ids.has(n.id))
  return { graph, nodes }
}

// packages behind live vlt links
const liveOwners = (mounts: SkillMount[]): DepID[] =>
  mounts.flatMap(m =>
    m.owner && existsSync(m.target) ? [m.owner] : [],
  )

// private copies of store-hardlinked files: edits via `./skills` must
// not reach the global store
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

/**
 * List the agent skills shipped by installed packages.
 */
export const listSkills = async (
  o: SkillsOptions,
): Promise<Skill[]> =>
  discoverSkills(
    (await selectNodes(o)).nodes,
    o.scurry,
    o.projectRoot,
    dir,
  ).skills

/**
 * Link the agent skills of the selected packages into `./skills/<skill>`.
 * One package per name: an existing link keeps it while its skill is
 * installed, else rank (main importer dep, importer dep, transitive),
 * then DepID; the others are reported. A link follows its package to
 * the picked version. Then remove vlt links whose skill is no longer
 * installed. Linked packages get private copies of files
 * hardlinked from the global store.
 */
export const linkSkills = async (
  o: LinkSkillsOptions,
): Promise<LinkSkillsResult> => {
  const { projectRoot } = o
  const res: LinkSkillsResult = {
    linked: [],
    unchanged: [],
    removed: [],
    conflicts: [],
  }
  const { graph, nodes } = await selectNodes(o)
  const { skills, scanned } = discoverSkills(
    nodes,
    o.scurry,
    projectRoot,
    dir,
  )
  const mounts = readMounts(projectRoot, dir)
  const byMount = new Map(mounts.map(m => [lc(m.mount), m]))
  // the link's skill is no longer installed: dangling, orphan owner,
  // or a scanned owner that no longer ships it
  const stale = (m: SkillMount) =>
    !m.owner ||
    !graph.nodes.has(m.owner) ||
    !existsSync(m.target) ||
    scanned
      .get(m.owner)
      ?.some(
        f =>
          lc(f.skill) === lc(basename(m.link)) &&
          samePath(f.path, m.target),
      ) === false
  const groups = new Map<string, Skill[]>()
  for (const s of skills) {
    const k = lc(s.skill)
    groups.set(k, [...(groups.get(k) ?? []), s])
  }
  const picks: [
    Skill | undefined,
    Skill[],
    SkillMount | undefined,
  ][] = []
  for (const [k, group] of groups) {
    const m = byMount.get(lc(`${dir}/${k}`))
    const key = m?.owner && packageKey(m.owner)
    // the link's package keeps the name, re-pointed if needed
    const own = group.find(s => packageKey(s.id) === key)
    // else a live link of another package keeps it
    const winner = own ?? (m && !stale(m) ? undefined : group[0])
    picks.push([winner, group.filter(s => s !== winner), m])
  }
  await unshareSkills(
    graph,
    [
      ...picks.flatMap(([w]) => (w ? [w.id] : [])),
      ...liveOwners(mounts),
    ],
    o.scurry,
  )
  for (const [winner, losers, m] of picks) {
    if (winner) {
      // replaced link named in another case (case-sensitive fs)
      if (m && m.mount !== winner.mount) {
        unmountSkill(m, projectRoot, dir)
      }
      const r = mountSkill(winner, projectRoot, dir)
      if (r === 'linked') res.linked.push({ ...winner, linked: true })
      else if (r === 'unchanged') res.unchanged.push(winner)
      else res.conflicts.push(winner.mount)
    }
    for (const s of losers)
      res.conflicts.push(`${s.mount} (${label(s)})`)
  }
  for (const m of readMounts(projectRoot, dir)) {
    if (!stale(m)) continue
    unmountSkill(m, projectRoot, dir)
    res.removed.push(m.mount)
  }
  return res
}

/**
 * Remove the vlt skill links of the selected packages (by the link's
 * owner), plus any dangling ones. Unset or `*` target removes them all.
 */
export const unlinkSkills = async (
  o: SkillsOptions,
): Promise<UnlinkSkillsResult> => {
  const { projectRoot, target } = o
  const ids =
    target && target !== '*' ?
      new Set((await selectNodes(o)).nodes.map(n => n.id))
    : undefined
  const removed: string[] = []
  for (const m of readMounts(projectRoot, dir)) {
    if (
      ids &&
      !(m.owner && ids.has(m.owner)) &&
      existsSync(m.target)
    ) {
      continue
    }
    unmountSkill(m, projectRoot, dir)
    removed.push(m.mount)
  }
  return { removed }
}

/**
 * Run after a reify. With `allowSkills` (not `:not(*)`), link the
 * skills of matching packages. Else best effort, never throws: remove
 * dangling vlt links (returned as `removed`, if any), keep store files
 * behind live ones private.
 */
export const syncSkills = async (
  o: SyncSkillsOptions,
): Promise<LinkSkillsResult | undefined> => {
  const { allowSkills, projectRoot } = o
  if (allowSkills && allowSkills !== ':not(*)') {
    return linkSkills({ ...o, target: allowSkills })
  }
  const removed: string[] = []
  try {
    const mounts = readMounts(projectRoot, dir)
    for (const m of mounts) {
      if (existsSync(m.target)) continue
      unmountSkill(m, projectRoot, dir)
      removed.push(m.mount)
    }
    await unshareSkills(o.graph, liveOwners(mounts), o.scurry)
  } catch {}
  return removed.length ?
      { linked: [], unchanged: [], removed, conflicts: [] }
    : undefined
}
