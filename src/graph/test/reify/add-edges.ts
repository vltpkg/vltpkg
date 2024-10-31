import { type PackageJson } from '@vltpkg/package-json'
import { type RollbackRemove } from '@vltpkg/rollback-remove'
import { type Manifest } from '@vltpkg/types'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { type Diff } from '../../src/diff.js'
import { type Edge } from '../../src/edge.js'

t.test('add some edges', async t => {
  const projectRoot = t.testdirName
  const reified: Edge[] = []
  const { addEdges } = await t.mockImport<
    typeof import('../../src/reify/add-edges.js')
  >('../../src/reify/add-edges.js', {
    '../../src/reify/add-edge.js': {
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

  const diff = {
    edges: {
      add: new Set([
        // no target, nothing to reify
        {},
        // this one gets reified
        {
          to: {
            // no manifest
            location: 'some/path',
          },
        },
        {
          to: { manifest: {} },
        },
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
  t.strictSame(
    new Set(reified),
    new Set([
      {
        to: {
          // no manifest
          location: 'some/path',
        },
      },
      {
        to: { manifest: {} },
      },
    ]),
  )
})
