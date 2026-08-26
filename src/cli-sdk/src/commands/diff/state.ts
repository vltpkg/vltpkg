import type { GraphDiff, Mutation, Region } from '@vltpkg/graph-diff'

export type Screen = 'summary' | 'region' | 'node'

export type State = {
  screen: Screen
  regionIndex: number
  mutationIndex: number
  /** whether identity-only noise is shown alongside the real changes */
  identity: boolean
}

export type Event =
  'MoveNext' | 'MovePrevious' | 'Select' | 'Back' | 'ToggleIdentity'

export const initialState: State = {
  screen: 'summary',
  regionIndex: 0,
  mutationIndex: 0,
  identity: false,
}

const shown = (m: Mutation, identity: boolean) =>
  identity || !m.identityOnly

/**
 * Regions holding nothing the user has asked to see are skipped
 * entirely, so toggling identity-only off never leaves empty rows.
 */
export const visibleRegions = (
  diff: GraphDiff,
  identity: boolean,
): Region[] =>
  diff.regions.filter(r => visibleMutations(diff, r, identity).length)

export const visibleMutations = (
  diff: GraphDiff,
  region: Region | undefined,
  identity: boolean,
): Mutation[] => {
  if (!region) return []
  const byId = new Map(diff.mutations.map(m => [m.id, m]))
  return region.mutationIds
    .map(id => byId.get(id))
    .filter((m): m is Mutation => !!m && shown(m, identity))
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
  const regions = visibleRegions(diff, state.identity)
  const region = regions[state.regionIndex]
  const mutations = visibleMutations(diff, region, state.identity)

  const move = (delta: number): State => {
    if (state.screen === 'summary') {
      return {
        ...state,
        regionIndex: clamp(state.regionIndex + delta, regions.length),
        mutationIndex: 0,
      }
    }
    if (state.screen === 'region') {
      return {
        ...state,
        mutationIndex: clamp(
          state.mutationIndex + delta,
          mutations.length,
        ),
      }
    }
    // the node screen shows one mutation, so moving steps between them
    // rather than doing nothing
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

    case 'Select':
      if (state.screen === 'summary') {
        // nothing to descend into when the diff is empty
        return regions.length ?
            { ...state, screen: 'region', mutationIndex: 0 }
          : state
      }
      if (state.screen === 'region') {
        return mutations.length ? { ...state, screen: 'node' } : state
      }
      return state

    case 'Back':
      if (state.screen === 'node')
        return { ...state, screen: 'region' }
      if (state.screen === 'region') {
        return { ...state, screen: 'summary' }
      }
      return state

    case 'ToggleIdentity': {
      const identity = !state.identity
      // the visible set just changed underneath us, so re-clamp rather
      // than leaving the cursor pointing past the end
      const next = visibleRegions(diff, identity)
      const regionIndex = clamp(state.regionIndex, next.length)
      return {
        ...state,
        identity,
        regionIndex,
        mutationIndex: clamp(
          state.mutationIndex,
          visibleMutations(diff, next[regionIndex], identity).length,
        ),
        screen: next.length ? state.screen : 'summary',
      }
    }
  }
}
