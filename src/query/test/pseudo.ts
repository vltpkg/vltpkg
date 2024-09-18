import t from 'tap'
import { pseudo } from '../src/pseudo.js'
import {
  getCycleGraph,
  getMissingManifestsGraph,
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from './fixtures/graph.js'
import { selectorFixture } from './fixtures/selector.js'
import { TestCase } from './fixtures/types.js'

const testPseudo = selectorFixture(pseudo)

t.test('pseudo', async t => {
  const simpleGraph = getSimpleGraph()
  const a = simpleGraph.nodes.get(';;a@1.0.0')!
  const b = simpleGraph.nodes.get(';;b@1.0.0')!
  const d = simpleGraph.nodes.get(';;d@1.0.0')!
  const all = [...simpleGraph.nodes.values()]
  const queryToExpected = new Set<TestCase>([
    [':root', all, ['my-project']], // from initial nodes
    [':root', [], ['my-project']], // from empty nodes
    [':root', [b], ['my-project']], // from diff node
    [':project', all, ['my-project']], // no workspaces in graph
    [':project', [], ['my-project']], // from empty nodes
    [':project', [b], ['my-project']], // from diff node
    [
      ':scope',
      all,
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // :scope refers to the initial values from initial
    [
      ':scope',
      [b],
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // :scope resets the initial values from a partial
    [
      ':scope',
      [],
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // :scope resets the initial values from empty partial
    // :attr selector
    [':attr([scripts])', all, ['b']], // prop lookup only
    [':attr([scripts])', [b], ['b']], // start with a single node
    [':attr([scripts])', [a], []], // unmatching single node
    [':attr([scripts])', [], []], // starting from empty
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
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // nested props within array
    [':empty', all, ['a', 'c', 'e', 'f', '@x/y']], // deps with no deps
    [':empty', [a], ['a']], // single :empty item
    [':empty', [b], []], // single not :empty item
    [':empty', [], []], // no items to filter
    [':has(*)', all, ['my-project', 'b', 'd']], // has any sub selector matches, e.g: children
    [':has(*)', [b], ['b']], // has any sub selector matches, e.g: children
    [':has([name=e])', all, ['my-project', 'd']], // has any sub selector matches, e.g: children
    [':has(* [name=e])', all, ['my-project', 'd']], // has any sub selector matches, e.g: children
    [':has(* > [name=e])', all, ['my-project', 'd']], // has any sub selector matches, e.g: children
    [':has(* > * > [name=f])', all, ['b', 'd']], // has any sub selector matches, e.g: children
    [':has([name=c], [name=f])', all, ['b', 'd']], // multi sub selectors
    [':has([name=c], [name=f])', [b], ['b']], // multi sub selectors, selecting from single item
    [':has([name=c], [name=f])', [], []], // multi sub selectors, selecting from no item
    [':has(~ :attr([peerDependenciesMeta]))', all, ['b']], // has any sub selector matches, e.g: children
    [':has(:attr([scripts]))', all, ['my-project']], // has child prop lookup
    [':has(:type(workspace))', all, []], // has no result
    [':is(:root)', all, ['my-project']], // can match a single node
    [':is([name=a], [name=b], [name=f])', all, ['a', 'b', 'f']], // can match multiple nodes
    [':is(:root)', [], []], // can't match from empty partial
    [
      ':is(#foo, .asdf, [name===z], :root +, :nonexistingselector)',
      all,
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // ignore any invalid selectors on loose mode
    //[':is(.asdf)', all, ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // ignore broken selectors on loose mode
    [':is([name=a], [name=b], [name=f])', [], []], // can match multiple nodes if no partial
    [':not(:root)', all, ['a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // can negate single node
    [
      ':not([name=a], [name=b], [name=f])',
      all,
      ['my-project', 'c', 'd', 'e', '@x/y'],
    ], // can negate multiple selectors
    [':not(:root)', [], []], // can't negate from empty partial
    [':not([name=a], [name=b], [name=f])', [], []], // can negate multiple nodes if no partial
    [':private', all, ['d']], // private dep
    [':private', [d], ['d']], // single :private item
    [':private', [b], []], // single not :private item
    [':private', [], []], // no items to filter
    [':type(file)', all, ['my-project', '@x/y']], // type selector
    [':type(git)', all, []], // type selector, no matches
    [':type(registry)', all, ['a', 'b', 'c', 'd', 'e', 'f']], // type selector, no matches
    [':type(registry)', [], []], // type selector, nothing to match
  ])
  for (const [query, partial, expected] of queryToExpected) {
    const initial = [...simpleGraph.nodes.values()]
    const result = await testPseudo(query, initial, partial)
    t.strictSame(
      result.map(i => i.name),
      expected,
      `query > "${query}"`,
    )
  }

  await t.test('workspace', async t => {
    const wsGraph = getSingleWorkspaceGraph()
    const w = simpleGraph.nodes.get(';;w@1.0.0')!
    const all = [...wsGraph.nodes.values()]
    const queryToExpected = new Set<TestCase>([
      [':root', all, ['ws']], // root
      [':project', all, ['ws', 'w']], // project = root & workspaces
      [':project', [], ['ws', 'w']], // from empty nodes
      [':project', [w], ['ws', 'w']], // from single node
      [':empty', all, ['ws', 'w']], // deps with no deps
      [':is(.workspace, :root)', all, ['ws', 'w']],
      [':is(.workspace, :root)', [], []],
      [':is(.workspace)', all, ['w']],
      [':is(.workspace)', [], []],
      [':not(.workspace, :root)', all, []], // excludes all items
      [':not(.workspace)', all, ['ws']], // excludes workspaces
      [':not(:root)', all, ['w']], // excludes root
      [':not(:root)', [], []], // empty starting partial
      [':private', all, []], // private dep
      [':type(registry)', all, []], // type selector
      [':type(workspace)', all, ['w']], // type selector workspace
      [':type(file)', all, ['ws']], // type selector root
    ])
    for (const [query, partial, expected] of queryToExpected) {
      const initial = [...wsGraph.nodes.values()]
      const result = await testPseudo(query, initial, partial)
      t.strictSame(
        result.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
    }
  })

  await t.test('cycle', async t => {
    const cycleGraph = getCycleGraph()
    const all = [...cycleGraph.nodes.values()]
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
    for (const [query, partial, expected] of queryToExpected) {
      const initial = [...cycleGraph.nodes.values()]
      const result = await testPseudo(query, initial, partial)
      t.strictSame(
        result.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
    }
  })

  await t.test('missing manifest', async t => {
    const mmGraph = getMissingManifestsGraph()
    const all = [...mmGraph.nodes.values()]
    const queryToExpected = new Set<TestCase>([
      [':attr([scripts])', all, []],
      [':attr(scripts, [test=foo])', all, []],
      [':is([name=a])', all, []],
    ])
    for (const [query, partial, expected] of queryToExpected) {
      const initial = [...mmGraph.nodes.values()]
      const result = await testPseudo(query, initial, partial)
      t.strictSame(
        result.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
    }
  })

  await t.test('missing importers info on nodes', async t => {
    await t.rejects(
      testPseudo(':project', [], []),
      /:project pseudo-element works on local graphs only/,
      'should throw an local-graph-only error',
    )

    await t.rejects(
      testPseudo(':root', [], []),
      /:root pseudo-element works on local graphs only/,
      'should throw an local-graph-only error',
    )
  })
})

t.test('bad selector type', async t => {
  await t.rejects(
    testPseudo('.dev', [], []),
    /Mismatching query node/,
    'should throw an error',
  )
})

t.test('unsupported pseudo', async t => {
  await t.rejects(
    testPseudo(':unsupportedpseudoclass', [], []),
    /Unsupported pseudo-class: :unsupportedpseudoclass/,
    'should throw an unsupported selector error',
  )
})

t.test('unexpected attr usage', async t => {
  await t.rejects(
    testPseudo(':attr', [], [], true),
    /Failed to parse :attr selector/,
    'should throw a failure to parse error',
  )
})
