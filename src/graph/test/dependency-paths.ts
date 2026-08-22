import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import type {
  NormalizedManifest,
  DependencyTypeShort,
} from '@vltpkg/types'
import t from 'tap'
import type { Test } from 'tap'
import { Graph } from '../src/graph.ts'
import type { Node } from '../src/node.ts'
import {
  countDependencyPaths,
  defaultMaxPaths,
  getDependencyPaths,
  getDependents,
} from '../src/dependency-paths.ts'

const specOptions = { registry: 'https://registry.npmjs.org/' }

const pp = (
  graph: Graph,
  fromNode: Node,
  name: string,
  manifest?: NormalizedManifest,
  depType: DependencyTypeShort = 'prod',
): Node => {
  const node = graph.placePackage(
    fromNode,
    depType,
    Spec.parse(`${name}@^1.0.0`, specOptions),
    manifest ?? { name, version: '1.0.0' },
  )
  if (!node) throw new Error(`failed to place ${name}`)
  return node
}

const newGraph = (t: Test, dependencies: Record<string, string>) =>
  new Graph({
    projectRoot: t.testdirName,
    ...specOptions,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      dependencies,
    },
  })

t.test('rejects anything that is not a Node', async t => {
  const none = { paths: [], truncated: false }
  t.strictSame(getDependencyPaths(undefined), none)
  t.strictSame(getDependencyPaths(null), none)
  t.strictSame(getDependencyPaths({ id: 'not-a-node' }), none)
  t.strictSame(getDependencyPaths('nope'), none)
})

t.test('returns a single direct path', async t => {
  const graph = newGraph(t, { foo: '^1.0.0' })
  const foo = pp(graph, graph.mainImporter, 'foo')

  t.strictSame(getDependencyPaths(foo).paths, ['my-project > foo'])
})

t.test('returns a nested path in root-to-node order', async t => {
  const graph = newGraph(t, { foo: '^1.0.0' })
  const foo = pp(graph, graph.mainImporter, 'foo', {
    name: 'foo',
    version: '1.0.0',
    dependencies: { bar: '^1.0.0' },
  })
  const bar = pp(graph, foo, 'bar', {
    name: 'bar',
    version: '1.0.0',
    dependencies: { baz: '^1.0.0' },
  })
  const baz = pp(graph, bar, 'baz')

  t.strictSame(getDependencyPaths(baz).paths, [
    'my-project > foo > bar > baz',
  ])
})

t.test(
  'returns every route to a package with several dependents',
  async t => {
    const graph = newGraph(t, { foo: '^1.0.0', bar: '^1.0.0' })
    const foo = pp(graph, graph.mainImporter, 'foo', {
      name: 'foo',
      version: '1.0.0',
      dependencies: { shared: '^1.0.0' },
    })
    const bar = pp(graph, graph.mainImporter, 'bar', {
      name: 'bar',
      version: '1.0.0',
      dependencies: { shared: '^1.0.0' },
    })
    const shared = pp(graph, foo, 'shared')
    // the same node is reached again from bar
    graph.placePackage(
      bar,
      'prod',
      Spec.parse('shared@^1.0.0', specOptions),
      { name: 'shared', version: '1.0.0' },
    )

    const { paths } = getDependencyPaths(shared)
    t.equal(paths.length, 2, 'both routes are reported')
    t.same(
      paths.sort(),
      [
        'my-project > bar > shared',
        'my-project > foo > shared',
      ].sort(),
    )
  },
)

t.test('returns nothing for an importer itself', async t => {
  const graph = newGraph(t, {})
  t.strictSame(
    getDependencyPaths(graph.mainImporter).paths,
    [],
    'an importer has no route to report',
  )
})

t.test('labels a node without a usable name by its id', async t => {
  const graph = newGraph(t, { foo: '^1.0.0' })
  const foo = pp(graph, graph.mainImporter, 'foo')
  // a manifest read off the wire can carry a name that isn't a string,
  // and Node's name getter hands that value straight back
  const nameless = graph.addNode(
    joinDepIDTuple(['registry', '', 'nameless@1.0.0']),
    { name: 42 as unknown as string, version: '1.0.0' },
  )
  graph.addEdge(
    'prod',
    Spec.parse('foo@^1.0.0', specOptions),
    nameless,
    foo,
  )

  const { paths } = getDependencyPaths(foo)
  t.same(
    paths.sort(),
    ['my-project > foo', `${nameless.id} > foo`].sort(),
    'the id stands in for the unusable name',
  )
  t.equal(
    getDependents(foo).find(d => d.name !== 'my-project')?.name,
    nameless.id,
    'and dependents are labeled the same way',
  )
})

t.test('caps the number of paths returned', async t => {
  const deps: Record<string, string> = {}
  for (let i = 0; i < defaultMaxPaths + 3; i++) {
    deps[`dep-${i}`] = '^1.0.0'
  }
  const graph = newGraph(t, deps)

  // every dep-N depends on the same shared package, so there are
  // defaultMaxPaths + 3 distinct routes to it
  let shared: Node | undefined
  for (let i = 0; i < defaultMaxPaths + 3; i++) {
    const dep = pp(graph, graph.mainImporter, `dep-${i}`, {
      name: `dep-${i}`,
      version: '1.0.0',
      dependencies: { shared: '^1.0.0' },
    })
    shared = pp(graph, dep, 'shared')
  }

  const capped = getDependencyPaths(shared)
  t.equal(
    capped.paths.length,
    defaultMaxPaths,
    'truncated at the default cap',
  )
  t.equal(
    capped.truncated,
    true,
    'reports truncation so a count is never presented as the total',
  )
  t.equal(
    getDependencyPaths(shared, { maxPaths: 2 }).paths.length,
    2,
    'honors an explicit cap',
  )
  t.strictSame(
    getDependencyPaths(shared, { maxPaths: 0 }).paths,
    [],
    'a cap below one collects nothing',
  )

  // counting visits the same graph without building strings, so it
  // reports the true total where the path walk would have capped
  const counted = countDependencyPaths(shared)
  t.equal(
    counted.count,
    defaultMaxPaths + 3,
    'counts every route, past the path cap',
  )
  t.equal(counted.truncated, false, 'and knows the count is complete')
  t.equal(
    countDependencyPaths(shared, { maxVisits: 3 }).truncated,
    true,
    'reports truncation when the visit budget runs out',
  )
})

t.test('stops when the visit budget runs out', async t => {
  const graph = newGraph(t, { foo: '^1.0.0' })
  const foo = pp(graph, graph.mainImporter, 'foo', {
    name: 'foo',
    version: '1.0.0',
    dependencies: { bar: '^1.0.0' },
  })
  const bar = pp(graph, foo, 'bar', {
    name: 'bar',
    version: '1.0.0',
    dependencies: { baz: '^1.0.0' },
  })
  const baz = pp(graph, bar, 'baz')

  t.strictSame(
    getDependencyPaths(baz, { maxVisits: 4 }),
    { paths: ['my-project > foo > bar > baz'], truncated: false },
    'a budget that covers the walk reports the whole route',
  )

  const spent = getDependencyPaths(baz, { maxVisits: 2 })
  t.strictSame(
    spent.paths,
    [],
    'the walk gives up before reaching an importer',
  )
  t.equal(
    spent.truncated,
    true,
    'and says so rather than claiming there is no route',
  )

  t.strictSame(
    getDependencyPaths(baz, { maxVisits: 0 }),
    { paths: [], truncated: true },
    'a budget of zero visits nothing',
  )
  t.strictSame(
    getDependencyPaths(baz, { maxVisits: -1 }),
    { paths: [], truncated: true },
    'a budget below zero is spent before the first visit',
  )
})

t.test('terminates on a dependency cycle', async t => {
  const graph = newGraph(t, { foo: '^1.0.0' })
  const foo = pp(graph, graph.mainImporter, 'foo', {
    name: 'foo',
    version: '1.0.0',
    dependencies: { bar: '^1.0.0' },
  })
  const bar = pp(graph, foo, 'bar', {
    name: 'bar',
    version: '1.0.0',
    dependencies: { foo: '^1.0.0' },
  })
  // close the loop: bar depends back on foo
  graph.placePackage(
    bar,
    'prod',
    Spec.parse('foo@^1.0.0', specOptions),
    { name: 'foo', version: '1.0.0' },
  )

  const { paths } = getDependencyPaths(bar)
  t.ok(paths.length > 0, 'still reports a route out of the cycle')
  for (const path of paths) {
    const names = path.split(' > ')
    t.equal(
      new Set(names).size,
      names.length,
      `no node repeats within ${path}`,
    )
  }
})

t.test('countDependencyPaths', async t => {
  t.test('rejects anything that is not a Node', async t => {
    const none = { count: 0, truncated: false }
    t.strictSame(countDependencyPaths(undefined), none)
    t.strictSame(countDependencyPaths(null), none)
    t.strictSame(countDependencyPaths({ id: 'not-a-node' }), none)
    t.strictSame(countDependencyPaths('nope'), none)
  })

  t.test('terminates on a dependency cycle', async t => {
    const graph = newGraph(t, { foo: '^1.0.0' })
    const foo = pp(graph, graph.mainImporter, 'foo', {
      name: 'foo',
      version: '1.0.0',
      dependencies: { bar: '^1.0.0' },
    })
    const bar = pp(graph, foo, 'bar', {
      name: 'bar',
      version: '1.0.0',
      dependencies: { foo: '^1.0.0' },
    })
    // close the loop: bar depends back on foo
    graph.placePackage(
      bar,
      'prod',
      Spec.parse('foo@^1.0.0', specOptions),
      { name: 'foo', version: '1.0.0' },
    )

    t.strictSame(
      countDependencyPaths(bar),
      { count: 1, truncated: false },
      'the route back into the cycle is not counted',
    )
  })

  t.test('counts a shared dependent only once', async t => {
    const graph = newGraph(t, { foo: '^1.0.0' })
    const foo = pp(graph, graph.mainImporter, 'foo', {
      name: 'foo',
      version: '1.0.0',
      dependencies: { bar: '^1.0.0' },
    })
    const bar = pp(graph, foo, 'bar')
    // foo reaches the same node twice, under an alias: two edges in
    // with the same `from`, which is one route, not two
    graph.addEdge(
      'prod',
      Spec.parse('bar-alias@npm:bar@^1.0.0', specOptions),
      foo,
      bar,
    )
    t.equal(bar.edgesIn.size, 2, 'both edges land on the same node')

    t.strictSame(
      countDependencyPaths(bar),
      { count: 1, truncated: false },
      'the duplicate parent is skipped',
    )
    t.strictSame(
      getDependencyPaths(bar).paths,
      ['my-project > foo > bar'],
      'and the path walk agrees',
    )
  })
})

t.test('getDependents', async t => {
  t.test('rejects anything that is not a Node', async t => {
    t.strictSame(getDependents(undefined), [])
    t.strictSame(getDependents({ id: 'not-a-node' }), [])
  })

  t.test(
    'reports each dependent with the range as written',
    async t => {
      const graph = newGraph(t, { foo: '^1.0.0' })
      const foo = pp(graph, graph.mainImporter, 'foo', {
        name: 'foo',
        version: '1.0.0',
        dependencies: { bar: '^1.0.0' },
      })
      const bar = pp(graph, foo, 'bar')

      const dependents = getDependents(bar)
      t.equal(dependents.length, 1)
      t.equal(dependents[0]?.name, 'foo')
      t.equal(
        dependents[0]?.range,
        '^1.0.0',
        'the caret range is preserved rather than expanded to comparators',
      )
    },
  )

  t.test('reports every dependent of a shared package', async t => {
    const graph = newGraph(t, { foo: '^1.0.0', bar: '^1.0.0' })
    const foo = pp(graph, graph.mainImporter, 'foo', {
      name: 'foo',
      version: '1.0.0',
      dependencies: { shared: '^1.0.0' },
    })
    const bar = pp(graph, graph.mainImporter, 'bar', {
      name: 'bar',
      version: '1.0.0',
      dependencies: { shared: '^1.0.0' },
    })
    const shared = pp(graph, foo, 'shared')
    graph.placePackage(
      bar,
      'prod',
      Spec.parse('shared@^1.0.0', specOptions),
      { name: 'shared', version: '1.0.0' },
    )

    const names = getDependents(shared)
      .map(d => d.name)
      .sort()
    t.strictSame(names, ['bar', 'foo'])
  })

  t.test(
    'falls back to the parsed range, then to no range at all',
    async t => {
      const graph = newGraph(t, { foo: '^1.0.0' })
      const foo = pp(graph, graph.mainImporter, 'foo')

      // a git specifier carries no literal semver string, but a
      // `#semver:` selector still parses to a range
      const gitDep = graph.addNode(
        joinDepIDTuple(['registry', '', 'git-dep@1.0.0']),
        { name: 'git-dep', version: '1.0.0' },
      )
      graph.addEdge(
        'prod',
        Spec.parse('foo@github:u/r#semver:^1.0.0', specOptions),
        gitDep,
        foo,
      )

      // and a bare git remote carries neither
      const rawDep = graph.addNode(
        joinDepIDTuple(['registry', '', 'raw-dep@1.0.0']),
        { name: 'raw-dep', version: '1.0.0' },
      )
      graph.addEdge(
        'prod',
        Spec.parse('foo@github:u/r', specOptions),
        rawDep,
        foo,
      )

      const ranges = new Map(
        getDependents(foo).map(d => [d.name, d.range]),
      )
      t.strictSame(
        [...ranges.keys()].sort(),
        ['git-dep', 'my-project', 'raw-dep'],
        'every dependent is reported',
      )
      t.equal(
        ranges.get('git-dep'),
        '>=1.0.0 <2.0.0-0',
        'the parsed range stands in when there is no range as written',
      )
      t.equal(
        ranges.get('raw-dep'),
        undefined,
        'a specifier with no range at all reports none',
      )
    },
  )

  t.test('returns nothing for an importer', async t => {
    const graph = newGraph(t, {})
    t.strictSame(getDependents(graph.mainImporter), [])
  })
})
