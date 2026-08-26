import type { GraphDiff, Mutation, Region } from '@vltpkg/graph-diff'

/**
 * Four levels, narrowing each time: the whole diff, one workspace, one
 * dependency tree inside it, one package inside that.
 */
export type Screen = 'summary' | 'workspace' | 'tree' | 'dep'

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

export const treesOf = (
  diff: GraphDiff,
  region: Region | undefined,
  filters: Filters,
): Tree[] => {
  const trees = new Map<string, Tree>()
  const get = (name: string) => {
    let tree = trees.get(name)
    if (!tree) {
      trees.set(name, (tree = { key: name, name, changes: [] }))
    }
    return tree
  }
  for (const m of visibleMutations(diff, region, filters)) {
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
  const regions = visibleRegions(diff, state)
  const region = regions[clamp(state.workspaceIndex, regions.length)]
  const trees = treesOf(diff, region, state)
  const tree = trees[clamp(state.treeIndex, trees.length)]
  const lines = tree ? treeLines(tree) : []
  return { regions, region, trees, tree, lines }
}

/** The rows the cursor walks on whichever screen is showing. */
const rowCount = (diff: GraphDiff, state: State) => {
  const { regions, trees, lines } = view(diff, state)
  return (
    state.screen === 'summary' ? regions.length
    : state.screen === 'workspace' ? trees.length
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
          state.screen === 'dep' ? 'tree'
          : state.screen === 'tree' ? 'workspace'
          : 'summary',
      }

    case 'ToggleIdentity':
    case 'ToggleDirect': {
      const filters =
        event === 'ToggleIdentity' ?
          { identity: !state.identity, directOnly: state.directOnly }
        : { identity: state.identity, directOnly: !state.directOnly }
      const regions = visibleRegions(diff, filters)
      // the visible set just changed underneath every cursor
      const workspaceIndex = clamp(
        state.workspaceIndex,
        regions.length,
      )
      const trees = treesOf(diff, regions[workspaceIndex], filters)
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
        screen: regions.length ? state.screen : 'summary',
      }
    }
  }
}
