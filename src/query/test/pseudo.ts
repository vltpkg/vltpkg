import t from 'tap'
import { pseudo } from '../src/pseudo.ts'
import {
  getCycleGraph,
  getMissingManifestsGraph,
  getMissingNodeGraph,
  getMultiWorkspaceGraph,
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from './fixtures/graph.ts'
import {
  copyGraphSelectionState,
  getGraphSelectionState,
  selectorFixture,
} from './fixtures/selector.ts'
import { type TestCase } from './fixtures/types.ts'
import { type GraphSelectionState } from '../src/types.ts'

const testPseudo = selectorFixture(pseudo)

t.test('pseudo', async t => {
  const simpleGraph = getSimpleGraph()
  const all = {
    edges: new Set(simpleGraph.edges),
    nodes: new Set(simpleGraph.nodes.values()),
  }
  const a = getGraphSelectionState(simpleGraph, 'a')
  const b = getGraphSelectionState(simpleGraph, 'b')
  const d = getGraphSelectionState(simpleGraph, 'd')
  const empty: GraphSelectionState = {
    edges: new Set(),
    nodes: new Set(),
  }
  const queryToExpected = new Set<TestCase>([
    [':root', all, ['my-project']], // from initial nodes
    [':root', empty, ['my-project']], // from empty nodes
    [':root', b, ['my-project']], // from diff node
    [':project', all, ['my-project']], // no workspaces in graph
    [':project', empty, ['my-project']], // from empty nodes
    [':project', b, ['my-project']], // from diff node
    [
      ':scope',
      all,
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // :scope refers to the initial values from initial
    [
      ':scope',
      b,
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // :scope resets the initial values from a partial
    [
      ':scope',
      empty,
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // :scope resets the initial values from empty partial
    // :attr selector
    [':attr([scripts])', all, ['b']], // prop lookup only
    [':attr([scripts])', b, ['b']], // start with a single node
    [':attr([scripts])', a, []], // unmatching single node
    [':attr([scripts])', empty, []], // starting from empty
    [':attr([bolinha])', all, []], // missing property
    [':attr(a, e, [bolinha])', all, []], // fail to match something in an array of strings
    [':attr(a, e, [bar])', all, []], // attr key can not match array items
    [':attr(a, [e])', all, ['d']], // match something in an array of strings
    [':attr(a, [e=bar])', all, ['d']], // match something in an array of strings
    [':attr(a, [e=foo])', all, ['d']], // match something in an array of strings
    [':attr([keywords=something])', all, ['c']], // match something in an array of strings
    [':attr([keywords=missing])', all, []], // can not match missing item in array
    [':attr(a, [e=baz])', all, []], // match something missing in an array of strings
    [':attr(foo, bar, [baz])', all, []], // multiple missing properties
    [':attr(scripts, [baz])', all, []], // mixed missing properties
    [':attr(scripts, bar, [baz])', all, []], // mixed missing properties
    [':attr(scripts, [postinstall])', all, ['b']], // nested prop
    [':attr(scripts, [test=test])', all, ['b']], // nested prop match
    [':attr(contributors, [name^=Ruy])', all, ['b']], // nested array
    [
      ':attr(contributors, [email=ruyadorno@example.com])',
      all,
      ['b'],
    ],
    [':attr([peerDependenciesMeta])', all, ['c']],
    [':attr(peerDependenciesMeta, [foo])', all, ['c']],
    [':attr(peerDependenciesMeta, foo, [optional])', all, ['c']], // 2-lvls
    [':attr(peerDependenciesMeta, foo, [optional=true])', all, ['c']],
    [':attr([a])', all, ['d']], // nested props start
    [':attr(a, [b])', all, ['d']], // nested props
    [':attr(a, b, [c])', all, ['d']], // nested props within array
    [':attr(a, b, c, [d])', all, ['d']], // nested props within array
    [':attr(a, b, c, [d=foo])', all, ['d']], // nested props within array
    [':attr(a, b, c, [d=bar])', all, ['d']], // nested props within array
    [
      ':attr([name])',
      all,
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // nested props within array
    [
      ':attr([version^=1])',
      all,
      ['my-project', 'a', 'c', 'd', 'e', 'f', '@x/y'],
    ], // nested props within array
    [':empty', all, ['a', 'c', 'e', 'f', '@x/y']], // deps with no deps
    [':empty', a, ['a']], // single :empty item
    [':empty', b, []], // single not :empty item
    [':empty', empty, []], // no items to filter
    [':has(*)', all, ['my-project', 'b', 'd']], // has any sub selector matches, e.g: children
    [':has(*)', b, ['b']], // has any sub selector matches, e.g: children
    [':has(> *)', all, ['my-project', 'b', 'd']], // has any sub selector matches, e.g: children
    [':has(> *)', b, ['b']], // has any sub selector matches, e.g: children
    [':has([name=e])', all, ['my-project', 'd']], // has any sub selector matches, e.g: children
    [':has(* [name=e])', all, ['my-project', 'd']], // has any sub selector matches, e.g: children
    [':has(* > [name=e])', all, ['my-project', 'd']], // has any sub selector matches, e.g: children
    [':has(* > * > [name=f])', all, ['d']], // has any sub selector matches, e.g: children
    [':has([name=c], [name=f])', all, ['b', 'd']], // multi sub selectors
    [':has([name=c], [name=f])', b, ['b']], // multi sub selectors, selecting from single item
    [':has([name=c], [name=f])', empty, []], // multi sub selectors, selecting from no item
    [':has(*[nonexistingattribute])', all, []], // nothing to match
    [':has(~ :attr([peerDependenciesMeta]))', all, ['b']], // has any sub selector matches, e.g: children
    [':has(:attr([scripts]))', all, ['my-project']], // has child prop lookup
    [':has(:type(workspace))', all, []], // has no result
    [':is(:root)', all, ['my-project']], // can match a single node
    [':is([name=a], [name=b], [name=f])', all, ['a', 'b', 'f']], // can match multiple nodes
    [':is(:root)', empty, []], // can't match from empty partial
    [
      ':is(#foo, .asdf, [name===z], :root +, :nonexistingselector)',
      all,
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // ignore any invalid selectors on loose mode
    //[':is(.asdf)', all, ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // ignore broken selectors on loose mode
    [':is([name=a], [name=b], [name=f])', empty, []], // can match multiple nodes if no partial
    [':missing', all, []], // no dangling edges in this graph
    [':not(:root)', all, ['a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // can negate single node
    [
      ':not([name=a], [name=b], [name=f])',
      all,
      ['my-project', 'c', 'd', 'e', '@x/y'],
    ], // can negate multiple selectors
    [':not(:root)', empty, []], // can't negate from empty partial
    [':not([name=a], [name=b], [name=f])', empty, []], // can negate multiple nodes if no partial
    [':private', all, ['d']], // private dep
    [':private', d, ['d']], // single :private item
    [':private', b, []], // single not :private item
    [':private', empty, []], // no items to filter
    [':type(file)', all, ['my-project', '@x/y']], // type selector
    [':type(git)', all, []], // type selector, no matches
    [':type(registry)', all, ['a', 'b', 'c', 'd', 'e', 'f']], // type selector, no matches
    [':type(registry)', empty, []], // type selector, nothing to match
  ])
  const initial = copyGraphSelectionState(all)
  for (const [query, partial, expected] of queryToExpected) {
    const result = await testPseudo(
      query,
      initial,
      copyGraphSelectionState(partial),
    )
    t.strictSame(
      result.nodes.map(i => i.name),
      expected,
      `query > "${query}"`,
    )
    t.matchSnapshot(
      {
        edges: result.edges.map(i => i.name).sort(),
        nodes: result.nodes.map(i => i.name).sort(),
      },
      `query > "${query}"`,
    )
  }

  await t.test('workspace', async t => {
    const wsGraph = getSingleWorkspaceGraph()
    const all: GraphSelectionState = {
      edges: new Set(wsGraph.edges),
      nodes: new Set(wsGraph.nodes.values()),
    }
    const w = getGraphSelectionState(wsGraph, 'w')
    const empty: GraphSelectionState = {
      edges: new Set(),
      nodes: new Set(),
    }
    const queryToExpected = new Set<TestCase>([
      [':root', all, ['ws']], // root
      [':project', all, ['ws', 'w']], // project = root & workspaces
      [':project', empty, ['ws', 'w']], // from empty nodes
      [':project', w, ['ws', 'w']], // from single node
      [':empty', all, ['ws', 'w']], // deps with no deps
      [':is(.workspace, :root)', all, ['ws', 'w']],
      [':is(.workspace, :root)', empty, []],
      [':is(.workspace)', all, ['w']],
      [':is(.workspace)', empty, []],
      [':not(.workspace, :root)', all, []], // excludes all items
      [':not(.workspace)', all, ['ws']], // excludes workspaces
      [':not(:root)', all, ['w']], // excludes root
      [':not(:root)', empty, []], // empty starting partial
      [':private', all, []], // private dep
      [':type(registry)', all, []], // type selector
      [':type(workspace)', all, ['w']], // type selector workspace
      [':type(file)', all, ['ws']], // type selector root
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial, expected] of queryToExpected) {
      const result = await testPseudo(
        query,
        initial,
        copyGraphSelectionState(partial),
      )
      t.strictSame(
        result.nodes.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
      t.matchSnapshot(
        {
          edges: result.edges.map(i => i.name).sort(),
          nodes: result.nodes.map(i => i.name).sort(),
        },
        `query > "${query}"`,
      )
    }
  })

  await t.test('complex workspace', async t => {
    const wsGraph = getMultiWorkspaceGraph()
    const all: GraphSelectionState = {
      edges: new Set(wsGraph.edges),
      nodes: new Set(wsGraph.nodes.values()),
    }
    //const w = getGraphSelectionState(wsGraph, 'w')
    const queryToExpected = new Set<TestCase>([
      [':root', all, ['ws']], // root
      [':project', all, ['ws', 'a', 'b', 'c']], // project = root & workspaces
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial, expected] of queryToExpected) {
      const result = await testPseudo(
        query,
        initial,
        copyGraphSelectionState(partial),
      )
      t.strictSame(
        result.nodes.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
      t.matchSnapshot(
        {
          edges: result.edges.map(i => i.name).sort(),
          nodes: result.nodes.map(i => i.name).sort(),
        },
        `query > "${query}"`,
      )
    }
  })

  await t.test('cycle', async t => {
    const cycleGraph = getCycleGraph()
    const all: GraphSelectionState = {
      edges: new Set(cycleGraph.edges),
      nodes: new Set(cycleGraph.nodes.values()),
    }
    const queryToExpected = new Set<TestCase>([
      [':root', all, ['cycle-project']], // root
      [':project', all, ['cycle-project']], // project = root & workspaces
      [':attr([scripts])', all, ['a', 'b']], // any pkgs with scripts
      [':attr(scripts, [test=foo])', all, ['a']], // any pkgs with scripts
      [':empty', all, []], // no deps with no deps
      [':is([name=a])', all, ['a']],
      [':private', all, []], // private dep
      [':type(registry)', all, ['a', 'b']], // type selector
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial, expected] of queryToExpected) {
      const result = await testPseudo(
        query,
        initial,
        copyGraphSelectionState(partial),
      )
      t.strictSame(
        result.nodes.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
      t.matchSnapshot(
        {
          edges: result.edges.map(i => i.name).sort(),
          nodes: result.nodes.map(i => i.name).sort(),
        },
        `query > "${query}"`,
      )
    }
  })

  await t.test('missing manifest', async t => {
    const mmGraph = getMissingManifestsGraph()
    const all: GraphSelectionState = {
      edges: new Set(mmGraph.edges),
      nodes: new Set(mmGraph.nodes.values()),
    }
    const queryToExpected = new Set<TestCase>([
      [':attr([scripts])', all, []],
      [':attr(scripts, [test=foo])', all, []],
      [':is([name=a])', all, []],
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial, expected] of queryToExpected) {
      const result = await testPseudo(
        query,
        initial,
        copyGraphSelectionState(partial),
      )
      t.strictSame(
        result.nodes.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
      t.matchSnapshot(
        {
          edges: result.edges.map(i => i.name).sort(),
          nodes: result.nodes.map(i => i.name).sort(),
        },
        `query > "${query}"`,
      )
    }
  })

  await t.test('missing node', async t => {
    const missingNodeGraph = getMissingNodeGraph()
    const all: GraphSelectionState = {
      edges: new Set(missingNodeGraph.edges),
      nodes: new Set(missingNodeGraph.nodes.values()),
    }
    // tests on missing node cases use only snapshot-check
    // giving that we want to assert missing / present edges
    const queryToExpected = new Set<TestCase>([
      [':missing', all, []],
      [':has(.dev)', all, []],
      [':private', all, []],
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial] of queryToExpected) {
      const result = await testPseudo(
        query,
        initial,
        copyGraphSelectionState(partial),
      )
      t.matchSnapshot(
        {
          edges: result.edges.map(i => i.name).sort(),
          nodes: result.nodes.map(i => i.name).sort(),
        },
        `query > "${query}"`,
      )
    }
  })

  await t.test('missing importers info on nodes', async t => {
    await t.rejects(
      testPseudo(':project'),
      /:project pseudo-element works on local graphs only/,
      'should throw an local-graph-only error',
    )

    await t.rejects(
      testPseudo(':root'),
      /:root pseudo-element works on local graphs only/,
      'should throw an local-graph-only error',
    )
  })
})

t.test('bad selector type', async t => {
  await t.rejects(
    testPseudo('.dev'),
    /Mismatching query node/,
    'should throw an error',
  )
})

t.test('unsupported pseudo', async t => {
  await t.rejects(
    testPseudo(':unsupportedpseudoclass'),
    /Unsupported pseudo-class: :unsupportedpseudoclass/,
    'should throw an unsupported selector error',
  )
})

t.test('unexpected attr usage', async t => {
  await t.rejects(
    testPseudo(':attr', undefined, undefined, true),
    /Failed to parse :attr selector/,
    'should throw a failure to parse error',
  )
})
