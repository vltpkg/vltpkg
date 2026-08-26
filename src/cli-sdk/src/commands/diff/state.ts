import type { GraphDiff, Mutation, Region } from '@vltpkg/graph-diff'

export type Screen = 'summary' | 'browse' | 'detail'

export type State = {
  screen: Screen
  /** row index into {@link flatten} */
  cursor: number
  /** whether identity-only noise is shown alongside the real changes */
  identity: boolean
  /** hide anything an importer does not depend on directly */
  directOnly: boolean
}

export type Event =
  | 'MoveNext'
  | 'MovePrevious'
  | 'Select'
  | 'Back'
  | 'ToggleIdentity'
  | 'ToggleDirect'

export const initialState: State = {
  screen: 'summary',
  cursor: 0,
  identity: false,
  directOnly: false,
}

const shown = (m: Mutation, state: Filters) =>
  (state.identity || !m.identityOnly) &&
  (!state.directOnly || m.directness === 'direct')

export type Filters = Pick<State, 'identity' | 'directOnly'>

/**
 * Row budget for one fullscreen frame, so header + body + footer comes
 * to exactly `rows`. Ink cannot scroll and clipping does not shrink a
 * node's height, so the only way to stay inside the terminal is to
 * render exactly this many rows and no more.
 */
export const layout = (rows: number) => {
  const body = Math.max(1, rows - 2)
  // each pane spends two rows on its border
  return { body, list: Math.max(1, body - 2) }
}

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

export type Triage = {
  /** major bumps, downgrades, and packages that actually went away */
  risky: Mutation[]
  /** what an importer asked for directly */
  yours: Mutation[]
  /** everything else, as counts -- never a list */
  routine: [label: string, count: number][]
}

/**
 * Split the diff into what a reader has to look at, what they chose,
 * and what merely happened. A real lockfile diff is mostly the third,
 * so listing all three would repeat the problem this replaces.
 */
export const triage = (diff: GraphDiff): Triage => {
  const gone = survivors(diff)
  const isRisky = (m: Mutation) =>
    (m.kind === 'package-resolved' &&
      (m.severity === 'major' || m.direction === 'downgrade')) ||
    (m.kind === 'node-removed' && !gone.has(m.node.name))

  const risky: Mutation[] = []
  const yours: Mutation[] = []
  const counts = new Map<string, number>()
  for (const m of diff.mutations) {
    if (isRisky(m)) risky.push(m)
    else if (m.directness === 'direct' && !m.identityOnly)
      yours.push(m)
    else {
      const label =
        m.identityOnly ? 'identity'
        : m.kind === 'package-resolved' ? m.severity
        : m.kind === 'node-changed' ? 'metadata'
        : m.kind
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
  }
  return {
    risky,
    yours,
    routine: [...counts].sort((a, z) => z[1] - a[1]),
  }
}

/**
 * Regions holding nothing the user has asked to see are skipped
 * entirely, so toggling identity-only off never leaves empty rows.
 */
export const visibleRegions = (
  diff: GraphDiff,
  filters: Filters,
): Region[] =>
  diff.regions.filter(r => visibleMutations(diff, r, filters).length)

// a fullscreen two-pane redraw asks for these far more often than the
// old layout did, so the id lookup is built once per diff
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

export type TreeRow =
  | { kind: 'area'; key: string; label: string; count: number }
  /** a direct dependency that pulled changes in without changing itself */
  | { kind: 'group'; key: string; label: string; count: number }
  | { kind: 'change'; key: string; mutation: Mutation; depth: 0 | 1 }

/**
 * The whole diff as one navigable tree: area, then the direct
 * dependency, then what it dragged in.
 *
 * A lockfile diff is mostly packages nobody chose, and listing them flat
 * leaves them floating with no hint of why they are there. Grouping each
 * under the direct dependency it arrived through -- `via`, recorded by
 * the graph walk that also assigns regions -- is what turns the list
 * back into an explanation.
 *
 * Two levels, not n: the chain below a direct dependency is almost
 * always a single-child line, and rendering it in full would rebuild the
 * noise this replaces.
 */
export const flatten = (
  diff: GraphDiff,
  filters: Filters,
): TreeRow[] => {
  const rows: TreeRow[] = []
  for (const region of visibleRegions(diff, filters)) {
    const mutations = visibleMutations(diff, region, filters)
    rows.push({
      kind: 'area',
      key: `area:${region.id}`,
      label: region.label,
      count: mutations.length,
    })

    // grouped by name rather than by id: `via` names whichever side of
    // the diff the walk went up, and the two sides of a bumped direct
    // dependency have different ids but the same name
    const children = new Map<string, Mutation[]>()
    const roots: Mutation[] = []
    for (const m of mutations) {
      if (m.via) {
        const kids = children.get(m.via.name)
        if (kids) kids.push(m)
        else children.set(m.via.name, [m])
      } else roots.push(m)
    }

    const child = (m: Mutation): TreeRow => ({
      kind: 'change',
      key: m.id,
      mutation: m,
      depth: 1,
    })

    const claimed = new Set<string>()
    for (const root of roots) {
      rows.push({
        kind: 'change',
        key: root.id,
        mutation: root,
        depth: 0,
      })
      const kids = children.get(nameOf(root))
      if (!kids) continue
      claimed.add(nameOf(root))
      rows.push(...kids.map(child))
    }
    // whatever pulled changes in without changing itself still needs a
    // heading, or its children would look like roots
    for (const [name, kids] of children) {
      if (claimed.has(name)) continue
      rows.push({
        kind: 'group',
        key: `group:${region.id}:${name}`,
        label: name,
        count: kids.length,
      })
      rows.push(...kids.map(child))
    }
  }
  return rows
}

const clamp = (n: number, length: number) =>
  length === 0 ? 0 : Math.min(Math.max(n, 0), length - 1)

/** The change under the cursor, if the cursor is on one. */
export const selected = (rows: TreeRow[], cursor: number) => {
  const row = rows[cursor]
  return row?.kind === 'change' ? row.mutation : undefined
}

/**
 * Navigation only. Quitting is an effect, not a state, so it stays in
 * the component that owns the Ink instance.
 */
export const reduce = (
  state: State,
  event: Event,
  diff: GraphDiff,
): State => {
  const rows = flatten(diff, state)

  switch (event) {
    case 'MoveNext':
      return {
        ...state,
        cursor: clamp(state.cursor + 1, rows.length),
      }
    case 'MovePrevious':
      return {
        ...state,
        cursor: clamp(state.cursor - 1, rows.length),
      }

    case 'Select':
      if (state.screen === 'summary') {
        return rows.length ?
            { ...state, screen: 'browse', cursor: 0 }
          : state
      }
      if (state.screen === 'browse') {
        // area and group rows are headings; there is nothing under them
        return selected(rows, state.cursor) ?
            { ...state, screen: 'detail' }
          : state
      }
      return state

    case 'Back':
      if (state.screen === 'detail')
        return { ...state, screen: 'browse' }
      if (state.screen === 'browse') {
        return { ...state, screen: 'summary' }
      }
      return state

    case 'ToggleIdentity':
    case 'ToggleDirect': {
      const filters =
        event === 'ToggleIdentity' ?
          { identity: !state.identity, directOnly: state.directOnly }
        : { identity: state.identity, directOnly: !state.directOnly }
      // the visible set just changed underneath the cursor
      const next = flatten(diff, filters)
      return {
        ...state,
        ...filters,
        cursor: clamp(state.cursor, next.length),
        // never strand the reader on a screen with nothing on it
        screen: next.length ? state.screen : 'summary',
      }
    }
  }
}
