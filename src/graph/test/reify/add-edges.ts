import type { RollbackRemove } from '@vltpkg/rollback-remove'
import * as fs from 'node:fs'
import type { MakeDirectoryOptions, PathLike } from 'node:fs'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'
import type { Edge } from '../../src/edge.ts'

t.test('add some edges', async t => {
  const projectRoot = t.testdirName
  const reified: Edge[] = []
  const binsSeen = new Map<Edge, Record<string, string> | undefined>()
  const { addEdges } = await t.mockImport<
    typeof import('../../src/reify/add-edges.ts')
  >('../../src/reify/add-edges.ts', {
    '../../src/reify/add-edge.ts': {
      addEdge: async (
        edge: Edge,
        _scurry: PathScurry,
        _remover: RollbackRemove,
        bins?: Record<string, string>,
      ) => {
        reified.push(edge)
        binsSeen.set(edge, bins)
      },
    },
  })

  const from = { name: 'x', inVltStore: () => false }
  const a = {
    from,
    spec: { name: 'a' },
    to: {
      bins: {},
    },
  }
  const b = {
    from,
    spec: { name: 'b' },
    to: { bins: {} },
  }
  const diff = {
    nodes: { add: new Set() },
    edges: {
      add: new Set([
        // no target, nothing to reify
        {},
        // these one gets reified
        a,
        b,
      ]),
    },
  } as unknown as Diff
  const scurry = new PathScurry(projectRoot)
  const actions = addEdges(
    diff,
    scurry,
    {} as unknown as RollbackRemove,
  )
  await Promise.all(actions.map(fn => fn()))
  t.strictSame(new Set(reified), new Set([a, b]))
  t.equal(binsSeen.get(a as unknown as Edge), a.to.bins)
  t.equal(binsSeen.get(b as unknown as Edge), b.to.bins)
})

t.test('scope dirs of new store packages', async t => {
  const projectRoot = t.testdir()
  const made: string[] = []
  const { addEdges } = await t.mockImport<
    typeof import('../../src/reify/add-edges.ts')
  >('../../src/reify/add-edges.ts', {
    '../../src/reify/add-edge.ts': { addEdge: async () => {} },
    'node:fs': {
      ...fs,
      mkdirSync: (path: PathLike, options?: MakeDirectoryOptions) => {
        made.push(String(path))
        return fs.mkdirSync(path, options)
      },
    },
  })
  const scurry = new PathScurry(projectRoot)
  const node = (name: string, inVltStore = true) => ({
    name,
    inVltStore: () => inVltStore,
    nodeModules: (s: PathScurry) =>
      s.resolve('nm-' + name.replace('/', '-')),
  })
  const p = node('p')
  const q = node('@s/q')
  const o = node('o')
  const w = node('w', false)
  const edge = (from: unknown, name: string, to: unknown = {}) => ({
    from,
    spec: { name },
    to,
  })
  const diff = {
    nodes: { add: new Set([p, q, w]) },
    edges: {
      add: new Set([
        edge(p, '@s/a'),
        edge(p, '@s/b'),
        edge(p, '@t/c'),
        edge(p, 'd'),
        edge(p, '@u/x', null),
        edge(q, '@s/x'),
        edge(o, '@v/y'),
        edge(w, '@w/z'),
      ]),
    },
  } as unknown as Diff
  const actions = addEdges(
    diff,
    scurry,
    {} as unknown as RollbackRemove,
  )
  t.equal(actions.length, 7, 'every edge with a target is linked')
  const scopes = [
    scurry.resolve('nm-p/@s'),
    scurry.resolve('nm-p/@t'),
  ]
  t.strictSame(made, scopes, 'one mkdir per missing scope dir')
  for (const dir of scopes) {
    t.ok(fs.statSync(dir).isDirectory(), 'scope dir made')
  }
})
