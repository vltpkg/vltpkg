import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'
import type { Edge } from '../../src/edge.ts'

t.test('add some edges', async t => {
  const projectRoot = t.testdirName
  const reified: Edge[] = []
  const { addEdges } = await t.mockImport<
    typeof import('../../src/reify/add-edges.ts')
  >('../../src/reify/add-edges.ts', {
    '../../src/reify/add-edge.ts': {
      addEdge: async (
        edge: Edge,
        _scurry: PathScurry,
        _remover: RollbackRemove,
        _bins?: Record<string, string>,
      ) => {
        reified.push(edge)
      },
    },
  })

  const a = {
    to: {
      bins: {},
    },
  }
  const b = {
    to: { bins: {} },
  }
  const diff = {
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
})
