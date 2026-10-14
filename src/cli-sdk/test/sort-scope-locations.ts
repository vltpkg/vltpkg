import { resolve } from 'node:path'
import t from 'tap'
import { Monorepo } from '@vltpkg/workspaces'
import { sortScopeLocations } from '../src/sort-scope-locations.ts'

const pkg = (name: string, deps: string[] = []) => ({
  'package.json': JSON.stringify({
    name,
    version: '1.0.0',
    dependencies: Object.fromEntries(
      deps.map(d => [d, 'workspace:*']),
    ),
  }),
})

const dir = t.testdir({
  'package.json': JSON.stringify({ name: 'root' }),
  src: {
    // chain a -> b -> c
    a: pkg('a', ['b']),
    b: pkg('b', ['c']),
    c: pkg('c'),
    // independent
    d: pkg('d'),
    e: pkg('e'),
    // cycle x <-> y
    x: pkg('x', ['y']),
    y: pkg('y', ['x']),
    // diamond p -> q,r -> s
    p: pkg('p', ['q', 'r']),
    q: pkg('q', ['s']),
    r: pkg('r', ['s']),
    s: pkg('s'),
  },
})

const monorepo = new Monorepo(dir, {
  config: { packages: ['src/*'] },
  load: {},
})
const ws = (name: string) => resolve(dir, 'src', name)
const sort = (...names: string[]) =>
  sortScopeLocations(names.map(ws), monorepo)
const expected = (...names: string[]) => names.map(ws)

t.test('no monorepo', async t => {
  const locs = expected('a', 'b')
  t.equal(sortScopeLocations(locs), locs)
})

t.test('single location', async t => {
  const locs = expected('a')
  t.equal(sortScopeLocations(locs, monorepo), locs)
})

t.test('only one workspace', async t => {
  const locs = [dir, ws('a')]
  t.equal(sortScopeLocations(locs, monorepo), locs)
})

t.test('chain', async t => {
  t.strictSame(sort('a', 'b', 'c'), expected('c', 'b', 'a'))
  t.strictSame(sort('b', 'a', 'c'), expected('c', 'b', 'a'))
  t.strictSame(
    sortScopeLocations(['./src/a', ws('b'), 'src/c'], monorepo),
    ['src/c', ws('b'), './src/a'],
  )
})

t.test('independent keeps query order', async t => {
  t.strictSame(sort('e', 'd'), expected('e', 'd'))
  t.strictSame(sort('d', 'e'), expected('d', 'e'))
})

t.test('dep may move ahead of unrelated match', async t => {
  t.strictSame(sort('b', 'd', 'c'), expected('c', 'b', 'd'))
})

t.test('non-workspace slots keep index', async t => {
  const foo = resolve(dir, 'node_modules/foo')
  t.strictSame(
    sortScopeLocations([dir, ws('a'), foo, ws('c')], monorepo),
    [dir, ws('c'), foo, ws('a')],
  )
})

t.test('duplicate workspace slot passes through', async t => {
  t.strictSame(
    sortScopeLocations([ws('a'), './src/a', ws('b')], monorepo),
    [ws('b'), './src/a', ws('a')],
  )
})

t.test('transitive via unmatched workspace', async t => {
  t.strictSame(sort('a', 'c'), expected('c', 'a'))
})

t.test('diamond via unmatched workspaces', async t => {
  t.strictSame(sort('p', 's'), expected('s', 'p'))
})

t.test('cycle broken deterministically', async t => {
  t.strictSame(sort('x', 'y'), expected('y', 'x'))
  t.strictSame(sort('y', 'x'), expected('x', 'y'))
})
