import type { PackageJson } from '@vltpkg/package-json'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { Manifest } from '@vltpkg/types'
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
        _mani: Manifest,
        _scurry: PathScurry,
        _remover: RollbackRemove,
      ) => {
        reified.push(edge)
      },
    },
  })

  const a = {
    to: {
      // no manifest
      resolvedLocation() {
        return 'some/path'
      },
    },
  }
  const b = {
    to: { manifest: {} },
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
  await Promise.all(
    addEdges(
      diff,
      { read: () => ({}) } as unknown as PackageJson,
      scurry,
      {} as unknown as RollbackRemove,
    ),
  )
  t.strictSame(new Set(reified), new Set([a, b]))
})
