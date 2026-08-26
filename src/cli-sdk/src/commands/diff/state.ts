import { depName } from '@vltpkg/graph-diff'
import type {
  Alert,
  GraphDiff,
  Mutation,
  Region,
} from '@vltpkg/graph-diff'

/**
 * Four levels, narrowing each time: the whole diff, one workspace, one
 * dependency tree inside it, one package inside that.
 */
export type Screen =
  | 'summary'
  | 'workspace'
  | 'tree'
  | 'dep'
  /** which workspaces the focused tree lands on */
  | 'reach'

export type State = {
  screen: Screen
  /** cursor into the workspace list on the summary */
  workspaceIndex: number
  /** cursor into that workspace's trees */
  treeIndex: number
  /** cursor into that tree's rows */
  depIndex: number
  /** whether identity-only noise is shown alongside the real changes */
  identity: boolean
  /** hide anything an importer does not depend on directly */
  directOnly: boolean
  /** the symbol legend, over whichever screen is showing */
  legend: boolean
}

export type Event =
  | 'MoveNext'
  | 'MovePrevious'
  | 'Select'
  | 'Back'
  | 'ToggleIdentity'
  | 'ToggleDirect'
  | 'ToggleLegend'
  | 'NextTree'
  | 'PreviousTree'
  | 'ShowReach'

export const initialState: State = {
  screen: 'summary',
  workspaceIndex: 0,
  treeIndex: 0,
  depIndex: 0,
  identity: false,
  directOnly: false,
  legend: false,
}

export type Filters = Pick<State, 'identity' | 'directOnly'>

const shown = (m: Mutation, filters: Filters) =>
  (filters.identity || !m.identityOnly) &&
  (!filters.directOnly || m.directness === 'direct')

/**
 * Row budget for one fullscreen frame, so header + body + footer comes
 * to exactly `rows`. Ink cannot scroll and clipping does not shrink a
 * node's height, so the only way to stay inside the terminal is to
 * render exactly this many rows and no more.
 */
export const layout = (rows: number) => ({
  body: Math.max(1, rows - 2),
})

/**
 * A window over a list that keeps the cursor in view. `size` comes from
 * {@link layout}, so it changes with the terminal.
 */
export const windowed = <T>(
  items: T[],
  index: number,
  size: number,
) => {
  const start = Math.max(
    0,
    Math.min(index - Math.floor(size / 2), items.length - size),
  )
  return {
    start,
    slice: items.slice(start, start + size),
    more: Math.max(0, items.length - start - size),
  }
}

/** The package a mutation is about, for grouping and for display. */
export const nameOf = (m: Mutation): string => {
  switch (m.kind) {
    case 'node-added':
    case 'node-removed':
      return m.node.name
    case 'node-changed':
    case 'node-identity-changed':
      return m.to.name
    case 'package-resolved':
    case 'peer-variants-regrouped':
      return m.name
    case 'edge-added':
    case 'edge-removed':
      return m.edge.name
    case 'edge-retargeted':
    case 'edge-respecified':
      return m.to.name
    default:
      return 'lockfile options'
  }
}

// a fullscreen redraw asks for these far more often than a static
// render does, so the id lookup is built once per diff
const indexes = new WeakMap<GraphDiff, Map<string, Mutation>>()
const indexOf = (diff: GraphDiff) => {
  let byId = indexes.get(diff)
  if (!byId) {
    indexes.set(
      diff,
      (byId = new Map(diff.mutations.map(m => [m.id, m]))),
    )
  }
  return byId
}

export const visibleMutations = (
  diff: GraphDiff,
  region: Region | undefined,
  filters: Filters,
): Mutation[] => {
  if (!region) return []
  const byId = indexOf(diff)
  return region.mutationIds
    .map(id => byId.get(id))
    .filter((m): m is Mutation => !!m && shown(m, filters))
}

/**
 * Regions holding nothing the user has asked to see are skipped
 * entirely, so toggling a filter never leaves empty rows.
 */
export const visibleRegions = (
  diff: GraphDiff,
  filters: Filters,
): Region[] =>
  diff.regions.filter(r => visibleMutations(diff, r, filters).length)

// which region a change was filed under, built once per diff
const regionIndexes = new WeakMap<GraphDiff, Map<string, Region>>()
const regionOf = (diff: GraphDiff, id: string) => {
  let byId = regionIndexes.get(diff)
  if (!byId) {
    byId = new Map()
    for (const r of diff.regions) {
      for (const m of r.mutationIds) byId.set(m, r)
    }
    regionIndexes.set(diff, byId)
  }
  return byId.get(id)
}

/**
 * Every workspace that reaches any of these changes.
 *
 * A tree lives in one workspace but its packages are usually shared, so
 * "this bump also lands on 40 other workspaces" is the thing a reviewer
 * needs before deciding how carefully to read it.
 */
export const workspacesFor = (
  diff: GraphDiff,
  changes: Mutation[],
): string[] => {
  const names = new Set<string>()
  for (const m of changes) {
    for (const id of regionOf(diff, m.id)?.importers ?? []) {
      names.add(depName(id))
    }
  }
  return [...names].sort()
}

/** One real workspace, and everything that reaches it. */
export type Workspace = {
  id: string
  label: string
  changes: Mutation[]
}

const UNREACHED = 'nothing reaches these'

/**
 * The workspaces a reader can actually open, not the regions the model
 * groups by.
 *
 * A region is keyed on a *set* of importers, so it can be labelled
 * "shared by 41 workspaces" -- true, and useless to navigate: nobody
 * wants to open "shared by 41 workspaces", they want to open theirs.
 * Fanning each region out to its members lists real workspaces, and a
 * change that reaches forty of them is counted in all forty, which is
 * what "does this affect me" means.
 */
export const workspacesOf = (
  diff: GraphDiff,
  filters: Filters,
): Workspace[] => {
  const byId = new Map<string, Workspace>()
  const get = (id: string, label: string) => {
    let ws = byId.get(id)
    if (!ws) byId.set(id, (ws = { id, label, changes: [] }))
    return ws
  }
  for (const region of diff.regions) {
    const changes = visibleMutations(diff, region, filters)
    if (!changes.length) continue
    if (!region.importers.length) {
      get(UNREACHED, UNREACHED).changes.push(...changes)
      continue
    }
    for (const id of region.importers) {
      get(id, depName(id)).changes.push(...changes)
    }
  }
  return [...byId.values()].sort(
    (a, z) =>
      z.changes.length - a.changes.length ||
      a.label.localeCompare(z.label),
  )
}

/**
 * Names that still exist on the head side of the diff.
 *
 * Needed because a `node-removed` is not necessarily a removal: the
 * N:M bucket pairing emits its leftovers that way, so a peer variant
 * being dropped looks identical to a package going away. A package is
 * only gone when its name appears nowhere on the head side.
 */
const survivors = (diff: GraphDiff) => {
  const names = new Set<string>()
  for (const m of diff.mutations) {
    switch (m.kind) {
      case 'package-resolved':
      case 'peer-variants-regrouped':
        names.add(m.name)
        break
      case 'node-added':
        names.add(m.node.name)
        break
      case 'node-changed':
      case 'node-identity-changed':
        names.add(m.to.name)
        break
    }
  }
  return names
}

/**
 * The handful of changes that are not a routine version bump, split by
 * what they actually are rather than filed under one vague heading. A
 * section that comes back empty is one the reader never has to read.
 */
export type Highlights = {
  major: Mutation[]
  downgraded: Mutation[]
  removed: Mutation[]
}

export const highlights = (diff: GraphDiff): Highlights => {
  const gone = survivors(diff)
  const major: Mutation[] = []
  const downgraded: Mutation[] = []
  const removed: Mutation[] = []
  for (const m of diff.mutations) {
    if (m.kind === 'package-resolved') {
      if (m.direction === 'downgrade') downgraded.push(m)
      else if (m.severity === 'major') major.push(m)
    } else if (m.kind === 'node-removed' && !gone.has(m.node.name)) {
      removed.push(m)
    }
  }
  return { major, downgraded, removed }
}

export type AlertRow = {
  id: string
  name: string
  type: string
  severity: Alert['severity']
  cve?: string
}

const WORST: Alert['severity'][] = [
  'critical',
  'high',
  'medium',
  'low',
]

/**
 * Alerts flattened into rows, worst first.
 *
 * Sorted rather than left in map order because the top row is the one
 * that gets read, and a critical buried under nine low ones may as well
 * not be reported.
 */
export const alertRows = (diff: GraphDiff): AlertRow[] =>
  Object.entries(diff.alerts ?? {})
    .flatMap(([id, list]) =>
      list.map(a => ({
        id,
        name: depName(id as never),
        type: a.type,
        severity: a.severity,
        ...(a.cve ? { cve: a.cve } : {}),
      })),
    )
    .sort(
      (a, z) =>
        WORST.indexOf(a.severity) - WORST.indexOf(z.severity) ||
        a.name.localeCompare(z.name),
    )

/** How many of these changes carry an alert. */
export const alertCount = (diff: GraphDiff, changes: Mutation[]) => {
  if (!diff.alerts) return 0
  let n = 0
  for (const m of changes)
    if (alertsFor(diff, nodeIdOf(m)).length) n++
  return n
}

/** The head-side node a change is about, which is what alerts key on. */
export const nodeIdOf = (m: Mutation | undefined) =>
  !m ? undefined
  : m.kind === 'node-added' || m.kind === 'node-removed' ? m.node.id
  : (
    m.kind === 'package-resolved' ||
    m.kind === 'node-changed' ||
    m.kind === 'node-identity-changed'
  ) ?
    m.to.id
  : undefined

/** The alerts against one package, if any. */
export const alertsFor = (diff: GraphDiff, id: string | undefined) =>
  (id && diff.alerts?.[id as never]) || []

/**
 * One direct dependency and everything that came into the graph under
 * it. This is the unit a reviewer actually works through: a bump and
 * its fallout, rather than a list of packages nobody chose.
 */
export type Tree = {
  key: string
  name: string
  /** the direct dependency's own change, when it changed too */
  root?: Mutation
  /** everything below it, in no particular order */
  changes: Mutation[]
}

export const treesOf = (changes: Mutation[]): Tree[] => {
  const trees = new Map<string, Tree>()
  const get = (name: string) => {
    let tree = trees.get(name)
    if (!tree) {
      trees.set(name, (tree = { key: name, name, changes: [] }))
    }
    return tree
  }
  for (const m of changes) {
    // grouped by name rather than id: the two sides of a bumped direct
    // dependency have different ids but are the same tree
    const head = m.path?.[0]
    if (head) get(head.name).changes.push(m)
    else get(nameOf(m)).root = m
  }
  return [...trees.values()].sort(
    (a, z) =>
      treeSize(z) - treeSize(a) || a.name.localeCompare(z.name),
  )
}

/** How many changes a tree holds, its own included. */
export const treeSize = (t: Tree) =>
  t.changes.length + (t.root ? 1 : 0)

export type TreeLine = {
  key: string
  name: string
  /** absent on an intermediate that did not itself change */
  mutation?: Mutation
  /** the box-drawing run that shows where this sits in the tree */
  prefix: string
}

type Node = {
  name: string
  mutation?: Mutation
  children: Map<string, Node>
}

const child = (parent: Node, name: string) => {
  let node = parent.children.get(name)
  if (!node) {
    parent.children.set(name, (node = { name, children: new Map() }))
  }
  return node
}

/**
 * A tree laid out as lines, with the box-drawing prefixes that show its
 * shape.
 *
 * Rebuilt from each change's `path`, so an intermediate package that did
 * not itself change still appears -- without it the tree would have
 * holes wherever the route ran through something unchanged.
 */
export const treeLines = (tree: Tree): TreeLine[] => {
  const root: Node = {
    name: tree.name,
    ...(tree.root ? { mutation: tree.root } : {}),
    children: new Map(),
  }
  for (const m of tree.changes) {
    // path[0] is this tree's own root, so the route below it starts at 1
    let at = root
    for (const step of m.path?.slice(1) ?? [])
      at = child(at, step.name)
    child(at, nameOf(m)).mutation = m
  }

  const lines: TreeLine[] = [
    {
      key: tree.name,
      name: tree.name,
      ...(tree.root ? { mutation: tree.root } : {}),
      prefix: '',
    },
  ]
  const walk = (node: Node, prefix: string, key: string) => {
    const kids = [...node.children.values()].sort((a, z) =>
      a.name.localeCompare(z.name),
    )
    kids.forEach((kid, i) => {
      const last = i === kids.length - 1
      lines.push({
        key: `${key}/${kid.name}`,
        name: kid.name,
        ...(kid.mutation ? { mutation: kid.mutation } : {}),
        prefix: `${prefix}${last ? '└─' : '├─'} `,
      })
      // the vertical only continues past a child that has siblings below
      walk(
        kid,
        `${prefix}${last ? '   ' : '│  '}`,
        `${key}/${kid.name}`,
      )
    })
  }
  walk(root, '', tree.name)
  return lines
}

const clamp = (n: number, length: number) =>
  length === 0 ? 0 : Math.min(Math.max(n, 0), length - 1)

/** Everything the four screens need, derived once per keypress. */
export const view = (diff: GraphDiff, state: State) => {
  const workspaces = workspacesOf(diff, state)
  const workspace =
    workspaces[clamp(state.workspaceIndex, workspaces.length)]
  const trees = treesOf(workspace?.changes ?? [])
  const tree = trees[clamp(state.treeIndex, trees.length)]
  const lines = tree ? treeLines(tree) : []
  return { workspaces, workspace, trees, tree, lines }
}

/** The rows the cursor walks on whichever screen is showing. */
const rowCount = (diff: GraphDiff, state: State) => {
  const { workspaces, trees, lines } = view(diff, state)
  return (
    state.screen === 'summary' ? workspaces.length
    : state.screen === 'workspace' ? trees.length
      // the reach list is read, not walked
    : state.screen === 'reach' ? 0
    : lines.length
  )
}

const cursorKey = (screen: Screen) =>
  screen === 'summary' ? ('workspaceIndex' as const)
  : screen === 'workspace' ? ('treeIndex' as const)
  : ('depIndex' as const)

/**
 * Navigation only. Quitting is an effect, not a state, so it stays in
 * the component that owns the Ink instance.
 */
export const reduce = (
  state: State,
  event: Event,
  diff: GraphDiff,
): State => {
  // the legend covers whatever is behind it, so only its own key and the
  // way out reach the screen underneath
  if (state.legend && event !== 'ToggleLegend' && event !== 'Back') {
    return state
  }

  const move = (delta: number): State => {
    const key = cursorKey(state.screen)
    return {
      ...state,
      [key]: clamp(state[key] + delta, rowCount(diff, state)),
      // a different workspace or tree invalidates the cursors below it
      ...(state.screen === 'summary' ?
        { treeIndex: 0, depIndex: 0 }
      : {}),
      ...(state.screen === 'workspace' ? { depIndex: 0 } : {}),
    }
  }

  switch (event) {
    case 'MoveNext':
      return move(1)
    case 'MovePrevious':
      return move(-1)

    case 'ToggleLegend':
      return { ...state, legend: !state.legend }

    case 'ShowReach':
      // only meaningful once a tree is in focus
      return state.screen === 'tree' || state.screen === 'dep' ?
          { ...state, screen: 'reach' }
        : state

    case 'NextTree':
    case 'PreviousTree': {
      // step sideways without going back up a level
      if (
        state.screen === 'summary' ||
        state.screen === 'workspace'
      ) {
        return state
      }
      const { trees } = view(diff, state)
      return {
        ...state,
        treeIndex: clamp(
          state.treeIndex + (event === 'NextTree' ? 1 : -1),
          trees.length,
        ),
        depIndex: 0,
      }
    }

    case 'Select': {
      if (!rowCount(diff, state)) return state
      if (state.screen === 'summary') {
        return { ...state, screen: 'workspace', treeIndex: 0 }
      }
      if (state.screen === 'workspace') {
        return { ...state, screen: 'tree', depIndex: 0 }
      }
      if (state.screen === 'tree') {
        // an unchanged intermediate is context, not something to open
        return view(diff, state).lines[state.depIndex]?.mutation ?
            { ...state, screen: 'dep' }
          : state
      }
      return state
    }

    case 'Back':
      if (state.legend) return { ...state, legend: false }
      return {
        ...state,
        screen:
          state.screen === 'dep' || state.screen === 'reach' ? 'tree'
          : state.screen === 'tree' ? 'workspace'
          : 'summary',
      }

    case 'ToggleIdentity':
    case 'ToggleDirect': {
      const filters =
        event === 'ToggleIdentity' ?
          { identity: !state.identity, directOnly: state.directOnly }
        : { identity: state.identity, directOnly: !state.directOnly }
      const workspaces = workspacesOf(diff, filters)
      // the visible set just changed underneath every cursor
      const workspaceIndex = clamp(
        state.workspaceIndex,
        workspaces.length,
      )
      const trees = treesOf(workspaces[workspaceIndex]?.changes ?? [])
      const treeIndex = clamp(state.treeIndex, trees.length)
      const tree = trees[treeIndex]
      return {
        ...state,
        ...filters,
        workspaceIndex,
        treeIndex,
        depIndex: clamp(
          state.depIndex,
          tree ? treeLines(tree).length : 0,
        ),
        // never strand the reader on a screen with nothing on it
        screen: workspaces.length ? state.screen : 'summary',
      }
    }
  }
}
