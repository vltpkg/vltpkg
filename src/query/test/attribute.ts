import { joinDepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import { attribute } from '../src/attribute.js'
import { getSimpleGraph } from './fixtures/graph.js'
import { selectorFixture } from './fixtures/selector.js'
import { TestCase } from './fixtures/types.js'

const testAttr = selectorFixture(attribute)

t.test('attribute', async t => {
  const simpleGraph = getSimpleGraph()
  const all = [...simpleGraph.nodes.values()]
  const b = simpleGraph.nodes.get(
    joinDepIDTuple(['registry', '', 'b@1.0.0']),
  )!
  const queryToExpected = new Set<TestCase>([
    [
      '[version="1.0.0"]',
      all,
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // attribute matches all
    ['[name="@x/y"]', all, ['@x/y']], // attribute matches scoped quoted
    ['[name^=m]', all, ['my-project']], // attribute starts with value
    ['[name^="m"]', all, ['my-project']], // attribute starts with value
    ['[name^=@x]', all, ['@x/y']], // attribute starts with scope
    ['[name^="@x"]', all, ['@x/y']], // attribute starts with scope
    ['[name$=project]', all, ['my-project']], // attribute ends with value
    ['[name$="project"]', all, ['my-project']], // attribute ends with value
    ['[name~=project]', all, ['my-project']], // attribute contains word
    ['[name~="project"]', all, ['my-project']], // attribute contains word
    ['[name~=notfound]', all, []], // attribute contains not found
    ['[name~="notfound"]', all, []], // attribute contains not found
    ['[name*=pro]', all, ['my-project']], // attribute contains string
    ['[name*="pro"]', all, ['my-project']], // attribute contains string
    ['[name|=my]', all, ['my-project']], // attribute starts with hyphened string
    ['[name|="my"]', all, ['my-project']], // attribute starts with hyphened string
    ['[name|="a"]', all, ['a']], // also matches on exact match
    ['[name="A"]', all, []], // case sensitive by default
    ['[name="A" i]', all, ['a']], // case insensitive flag
    ['[name="A" s]', all, []], // case insensitive flag
    ['[name="a"]', [], []], // no matches if starting from empty partial
    ['[name="a"]', [b], []], // no matches if node can't be find in partial
    ['[name="b"]', [b], ['b']], // matches single node found
    ['[keywords=something]', all, ['c']], // matches item in array prop
    ['[keywords=missing]', all, []], // can not match missing item in array
  ])
  for (const [query, partial, expected] of queryToExpected) {
    const initial = [...simpleGraph.nodes.values()]
    const res = await testAttr(query, initial, partial)
    t.strictSame(
      res.map(i => i.name),
      expected,
      `query > "${query}"`,
    )
  }
})

t.test('bad selector type', async t => {
  await t.rejects(
    testAttr('.dev', [], []),
    /Mismatching query node/,
    'should throw an error',
  )
})

t.test('bad operator', async t => {
  await t.rejects(
    testAttr('[name==foo]', [], []),
    /Unsupported attribute operator: +=/,
    'should throw an error',
  )
})

t.test('bad operator [loose mode]', async t => {
  await t.resolves(
    testAttr('[name==foo]', [], [], true),
    'should resolve with no error',
  )
})

t.test(
  'unquotted scoped names are not supported by the parser',
  async t => {
    await t.rejects(
      testAttr('[name=@x/y]', [], []),
      /Unexpected "\/" found./,
      'should throw an error',
    )
  },
)
