import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'

t.test('relink bins still declared by remaining edges', async t => {
  const projectRoot = t.testdir({
    node_modules: { '.bin': { cli: 'existing' } },
  })
  const linked: string[][] = []
  const { relinkBins } = await t.mockImport<
    typeof import('../../src/reify/relink-bins.ts')
  >('../../src/reify/relink-bins.ts', {
    '../../src/reify/add-edge.ts': {
      linkBin: async (
        path: string,
        binRoot: string,
        key: string,
        val: string,
      ) => {
        linked.push([path, binRoot, key, val])
      },
    },
  })

  const nm = resolve(projectRoot, 'node_modules')
  const root = {
    id: 'root',
    nodeModules: () => nm,
    edgesOut: new Map(
      [
        // missing optional dep, nothing to link
        { spec: { name: 'gone' } },
        { spec: { name: 'nobins' }, to: {} },
        { spec: { name: 'other' }, to: { bins: { other: 'o.js' } } },
        {
          spec: { name: 'b' },
          to: { bins: { tool: 'b.js', cli: 'cli.js' } },
        },
        // tool is already provided by b
        { spec: { name: 'c' }, to: { bins: { tool: 'c.js' } } },
      ].map(edge => [edge.spec.name, edge]),
    ),
  }
  const diff = {
    to: { nodes: new Map([['root', root]]) },
    edges: {
      delete: new Set([
        // removed along with its importer
        { from: { id: 'deleted' }, to: { bins: { tool: 'x.js' } } },
        // no bins to relink
        { from: { id: 'root' }, to: {} },
        { from: { id: 'root' } },
        {
          from: { id: 'root' },
          to: { bins: { tool: 'a.js', cli: 'cli.js', none: 'n.js' } },
        },
        // tool was already handled
        { from: { id: 'root' }, to: { bins: { tool: 'a2.js' } } },
      ]),
    },
  } as unknown as Diff
  const scurry = new PathScurry(projectRoot)
  const actions = relinkBins(
    diff,
    scurry,
    {} as unknown as RollbackRemove,
  )
  t.equal(actions.length, 2, 'one action per bin with a provider')
  await Promise.all(actions.map(fn => fn()))
  t.strictSame(
    linked,
    [[resolve(nm, 'b'), resolve(nm, '.bin'), 'tool', 'b.js']],
    'links the missing bin, leaves the existing one',
  )
})
