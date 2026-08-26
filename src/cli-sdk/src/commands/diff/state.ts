import type { GraphDiff, Mutation, Region } from '@vltpkg/graph-diff'

export type Screen = 'summary' | 'browse' | 'detail'

/** Which half of the browse screen the cursor is in. */
export type Pane = 'areas' | 'changes'

export type State = {
  screen: Screen
  pane: Pane
  regionIndex: number
  mutationIndex: number
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
  | 'NextPane'
  | 'PreviousPane'
  | 'ToggleIdentity'
  | 'ToggleDirect'

export const initialState: State = {
  screen: 'summary',
  pane: 'areas',
  regionIndex: 0,
  mutationIndex: 0,
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

const clamp = (n: number, length: number) =>
  length === 0 ? 0 : Math.min(Math.max(n, 0), length - 1)

/**
 * Navigation only. Quitting is an effect, not a state, so it stays in
 * the component that owns the Ink instance.
 */
export const reduce = (
  state: State,
  event: Event,
  diff: GraphDiff,
): State => {
  const regions = visibleRegions(diff, state)
  const region = regions[state.regionIndex]
  const mutations = visibleMutations(diff, region, state)

  /** re-clamp both cursors after a filter changed what is visible */
  const refilter = (filters: Filters): State => {
    const next = visibleRegions(diff, filters)
    const regionIndex = clamp(state.regionIndex, next.length)
    return {
      ...state,
      ...filters,
      regionIndex,
      mutationIndex: clamp(
        state.mutationIndex,
        visibleMutations(diff, next[regionIndex], filters).length,
      ),
      // never strand the reader on a screen with nothing on it
      screen: next.length ? state.screen : 'summary',
    }
  }

  const move = (delta: number): State => {
    // on the summary the cursor walks the risky/yours list; on browse it
    // walks whichever pane has focus; on detail it steps between changes
    if (state.screen === 'browse' && state.pane === 'areas') {
      const regionIndex = clamp(
        state.regionIndex + delta,
        regions.length,
      )
      return { ...state, regionIndex, mutationIndex: 0 }
    }
    if (state.screen === 'summary') {
      return {
        ...state,
        regionIndex: clamp(state.regionIndex + delta, regions.length),
        mutationIndex: 0,
      }
    }
    return {
      ...state,
      mutationIndex: clamp(
        state.mutationIndex + delta,
        mutations.length,
      ),
    }
  }

  switch (event) {
    case 'MoveNext':
      return move(1)
    case 'MovePrevious':
      return move(-1)

    case 'NextPane':
      return state.screen === 'browse' ?
          { ...state, pane: 'changes' }
        : state
    case 'PreviousPane':
      return state.screen === 'browse' ?
          { ...state, pane: 'areas' }
        : state

    case 'Select':
      if (state.screen === 'summary') {
        // nothing to descend into when the diff is empty
        return regions.length ?
            {
              ...state,
              screen: 'browse',
              pane: 'areas',
              mutationIndex: 0,
            }
          : state
      }
      if (state.screen === 'browse') {
        // from the areas pane, Enter moves into the changes rather than
        // skipping a level to a change the reader has not chosen yet
        if (state.pane === 'areas') {
          return mutations.length ?
              { ...state, pane: 'changes' }
            : state
        }
        return mutations.length ?
            { ...state, screen: 'detail' }
          : state
      }
      return state

    case 'Back':
      if (state.screen === 'detail')
        return { ...state, screen: 'browse' }
      if (state.screen === 'browse') {
        return state.pane === 'changes' ?
            { ...state, pane: 'areas' }
          : { ...state, screen: 'summary' }
      }
      return state

    case 'ToggleIdentity':
      return refilter({
        identity: !state.identity,
        directOnly: state.directOnly,
      })

    case 'ToggleDirect':
      return refilter({
        identity: state.identity,
        directOnly: !state.directOnly,
      })
  }
}
