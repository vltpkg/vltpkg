import t from 'tap'
import {
  initialState,
  reduce,
  visibleMutations,
  visibleRegions,
} from '../../../src/commands/diff/state.ts'
import type {
  Event,
  State,
} from '../../../src/commands/diff/state.ts'
import type { GraphDiff, Mutation } from '@vltpkg/graph-diff'

/**
 * A diff with two regions: one holding a real change and an identity-only
 * one, the other holding nothing but noise. The second region therefore
 * disappears entirely when identity-only is off.
 */
const mutation = (id: string, identityOnly = false): Mutation =>
  ({
    id,
    kind: 'node-added',
    directness: 'transitive',
    identityOnly,
    node: { id: `··${id}@1.0.0`, name: id },
  }) as unknown as Mutation

const diff = {
  summary: {},
  mutations: [
    mutation('real-a'),
    mutation('real-b'),
    mutation('noise-a', true),
    mutation('noise-b', true),
  ],
  regions: [
    {
      id: 'r1',
      label: 'www/docs',
      importers: ['workspace~www+docs'],
      nodes: [],
      mutationIds: ['real-a', 'real-b', 'noise-a'],
    },
    {
      id: 'r2',
      label: 'quiet',
      importers: [],
      nodes: [],
      mutationIds: ['noise-b'],
    },
  ],
} as unknown as GraphDiff

const empty = {
  summary: {},
  mutations: [],
  regions: [],
} as unknown as GraphDiff

const run = (events: Event[], from: State = initialState, d = diff) =>
  events.reduce((s, e) => reduce(s, e, d), from)

t.test('identity-only changes what is visible', async t => {
  t.strictSame(
    visibleRegions(diff, false).map(r => r.label),
    ['www/docs'],
    'a region holding only noise is hidden entirely',
  )
  t.strictSame(
    visibleRegions(diff, true).map(r => r.label),
    ['www/docs', 'quiet'],
  )
  t.strictSame(
    visibleMutations(diff, diff.regions[0], false).map(m => m.id),
    ['real-a', 'real-b'],
  )
  t.strictSame(
    visibleMutations(diff, diff.regions[0], true).map(m => m.id),
    ['real-a', 'real-b', 'noise-a'],
  )
  t.strictSame(visibleMutations(diff, undefined, true), [])
})

t.test('moving clamps at both ends of every screen', async t => {
  t.equal(run(['MovePrevious']).regionIndex, 0, 'no wrap backwards')
  t.equal(
    run(['MoveNext', 'MoveNext', 'MoveNext']).regionIndex,
    0,
    'only one region is visible, so next goes nowhere',
  )

  const inRegion = run(['Select'])
  t.equal(inRegion.screen, 'region')
  t.equal(run(['MoveNext'], inRegion).mutationIndex, 1)
  t.equal(
    run(['MoveNext', 'MoveNext', 'MoveNext'], inRegion).mutationIndex,
    1,
    'clamps at the last mutation',
  )
  t.equal(run(['MovePrevious'], inRegion).mutationIndex, 0)
})

t.test('the node screen steps between changes', async t => {
  const node = run(['Select', 'Select'])
  t.equal(node.screen, 'node')
  t.equal(node.mutationIndex, 0)
  const next = run(['MoveNext'], node)
  t.equal(next.mutationIndex, 1, 'stays on the node screen')
  t.equal(next.screen, 'node')
})

t.test('back walks up, and stops at the summary', async t => {
  const node = run(['Select', 'Select'])
  t.equal(run(['Back'], node).screen, 'region')
  t.equal(run(['Back', 'Back'], node).screen, 'summary')
  t.equal(
    run(['Back', 'Back', 'Back'], node).screen,
    'summary',
    'quitting is an effect, not a state, so back bottoms out here',
  )
})

t.test(
  'select does nothing when there is nothing to select',
  async t => {
    t.strictSame(
      reduce(initialState, 'Select', empty),
      initialState,
      'an empty diff has no region to descend into',
    )
    const region = { ...initialState, screen: 'region' as const }
    t.strictSame(
      reduce(region, 'Select', empty),
      region,
      'and no mutation to open',
    )
    t.strictSame(
      reduce({ ...initialState, screen: 'node' }, 'Select', diff)
        .screen,
      'node',
      'the node screen is the bottom',
    )
  },
)

t.test('toggling identity re-clamps the cursor', async t => {
  // sitting on the second region, which only exists while noise is shown
  const deep = run(
    ['ToggleIdentity', 'MoveNext', 'Select', 'Select'],
    initialState,
  )
  t.equal(deep.regionIndex, 1)
  t.equal(deep.screen, 'node')

  const off = reduce(deep, 'ToggleIdentity', diff)
  t.equal(off.identity, false)
  t.equal(
    off.regionIndex,
    0,
    'the region it pointed at is gone, so it clamps back',
  )
  t.equal(off.mutationIndex, 0)
})

t.test(
  'toggling back to nothing visible returns to the summary',
  async t => {
    const onlyNoise = {
      summary: {},
      mutations: [mutation('noise', true)],
      regions: [
        {
          id: 'r',
          label: 'quiet',
          importers: [],
          nodes: [],
          mutationIds: ['noise'],
        },
      ],
    } as unknown as GraphDiff

    const deep = run(
      ['ToggleIdentity', 'Select', 'Select'],
      initialState,
      onlyNoise,
    )
    t.equal(deep.screen, 'node')
    const off = reduce(deep, 'ToggleIdentity', onlyNoise)
    t.equal(
      off.screen,
      'summary',
      'never strand the user on a screen with nothing on it',
    )
  },
)

t.test('clamping an empty list stays at zero', async t => {
  t.equal(reduce(initialState, 'MoveNext', empty).regionIndex, 0)
  t.equal(
    reduce({ ...initialState, screen: 'region' }, 'MoveNext', empty)
      .mutationIndex,
    0,
  )
  t.equal(
    reduce({ ...initialState, screen: 'node' }, 'MovePrevious', empty)
      .mutationIndex,
    0,
  )
})
