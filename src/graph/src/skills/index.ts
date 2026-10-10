import { existsSync } from 'node:fs'
import type { PathScurry } from 'path-scurry'
import { load as loadActual } from '../actual/load.ts'
import type { LoadOptions } from '../actual/load.ts'
import { filterNodesByQuery } from '../filter-nodes-by-query.ts'
import type { Graph } from '../graph.ts'
import { unshare } from '../reify/unshare.ts'
import { discoverSkills } from './discover.ts'
import type { Skill } from './discover.ts'
import { mountSkill, readMounts, unmountSkill } from './mounts.ts'

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
  /** stale mounts removed, `/`-separated relative paths */
  removed: string[]
  /** mount paths skipped: something not managed by vlt is in the way */
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

const selectNodes = async (o: SkillsOptions) => {
  const graph = o.graph ?? loadActual({ ...o, loadManifests: true })
  const ids = await filterNodesByQuery(graph, o.target ?? '*')
  const nodes = [...graph.nodes.values()].filter(n => ids.has(n.id))
  return { graph, nodes }
}

// packages behind live vlt links
const liveNames = (projectRoot: string) =>
  readMounts(projectRoot)
    .filter(m => existsSync(m.target))
    .map(m => m.name)

// private copies of store-hardlinked files: edits via `./skills` must
// not reach the global store
const unshareSkills = async (
  graph: Graph,
  names: Iterable<string>,
  scurry: PathScurry,
) => {
  const set = new Set(names)
  if (!set.size) return
  for (const node of graph.nodes.values()) {
    if (!node.importer && node.inVltStore() && set.has(node.name)) {
      await unshare(node.resolvedLocation(scurry))
    }
  }
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
  )

/**
 * Link the agent skills of the selected packages into
 * `./skills/<package>/<skill>`, then prune stale vlt links: dangling,
 * or no longer a skill of a linked package. Linked packages get
 * private copies of files hardlinked from the global store.
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
  const skills = discoverSkills(nodes, o.scurry, projectRoot)
  await unshareSkills(
    graph,
    [...skills.map(s => s.name), ...liveNames(projectRoot)],
    o.scurry,
  )
  for (const skill of skills) {
    const r = mountSkill(skill, projectRoot)
    if (r === 'linked') res.linked.push({ ...skill, linked: true })
    else if (r === 'unchanged') res.unchanged.push(skill)
    else res.conflicts.push(skill.mount)
  }
  // stale: dangling, or a linked package's mount that is not one of
  // its current skills (eg, dropped in a new version)
  const lc = (s: string) => s.toLowerCase()
  const names = new Set(skills.map(s => lc(s.name)))
  const mounts = new Set(skills.map(s => lc(s.mount)))
  for (const m of readMounts(projectRoot)) {
    const old = names.has(lc(m.name)) && !mounts.has(lc(m.mount))
    if (!old && existsSync(m.target)) continue
    unmountSkill(m, projectRoot)
    res.removed.push(m.mount)
  }
  return res
}

/**
 * Remove the vlt skill links of the selected packages, plus any dangling
 * ones. Unset or `*` target removes them all.
 */
export const unlinkSkills = async (
  o: SkillsOptions,
): Promise<UnlinkSkillsResult> => {
  const { projectRoot, target } = o
  const names =
    target && target !== '*' ?
      new Set(
        (await selectNodes(o)).nodes
          .filter(n => !n.importer)
          .map(n => n.name),
      )
    : undefined
  const removed: string[] = []
  for (const m of readMounts(projectRoot)) {
    if (names && !names.has(m.name) && existsSync(m.target)) continue
    unmountSkill(m, projectRoot)
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
    for (const m of readMounts(projectRoot)) {
      if (existsSync(m.target)) continue
      unmountSkill(m, projectRoot)
      removed.push(m.mount)
    }
    await unshareSkills(o.graph, liveNames(projectRoot), o.scurry)
  } catch {}
  return removed.length ?
      { linked: [], unchanged: [], removed, conflicts: [] }
    : undefined
}
