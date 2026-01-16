import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import t from 'tap'
import type {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../../src/dependencies.ts'
import { asDependency } from '../../src/dependencies.ts'
import { Edge } from '../../src/edge.ts'
import { Graph } from '../../src/graph.ts'
import {
  compareByHasPeerDeps,
  compareByType,
  getNodeOrderedDependencies,
  getOrderedDependencies,
  isPeerType,
} from '../../src/ideal/sorting.ts'

t.test('isPeerType', async t => {
  t.ok(isPeerType('peer'), 'should return true for peer')
  t.ok(
    isPeerType('peerOptional'),
    'should return true for peerOptional',
  )
  t.notOk(isPeerType('prod'), 'should return false for prod')
  t.notOk(isPeerType('dev'), 'should return false for dev')
  t.notOk(isPeerType('optional'), 'should return false for optional')
  t.notOk(
    isPeerType('unknown'),
    'should return false for unknown type',
  )
})

t.test('compareByHasPeerDeps', async t => {
  t.test(
    'sorts items without peer deps before those with',
    async t => {
      const noPeers = { manifest: {} }
      const withPeers = {
        manifest: { peerDependencies: { react: '^18.0.0' } },
      }
      t.equal(
        compareByHasPeerDeps(noPeers, withPeers),
        -1,
        'no peers should come before with peers',
      )
      t.equal(
        compareByHasPeerDeps(withPeers, noPeers),
        1,
        'with peers should come after no peers',
      )
    },
  )

  t.test('sorts by name when both have no peer deps', async t => {
    const a = { manifest: { name: 'alpha' } }
    const b = { manifest: { name: 'beta' } }
    t.ok(
      compareByHasPeerDeps(a, b) < 0,
      'alpha should come before beta',
    )
    t.ok(
      compareByHasPeerDeps(b, a) > 0,
      'beta should come after alpha',
    )
    t.equal(compareByHasPeerDeps(a, a), 0, 'same name equals 0')
  })

  t.test('sorts by name when both have peer deps', async t => {
    const a = {
      manifest: {
        name: 'alpha',
        peerDependencies: { react: '^18.0.0' },
      },
    }
    const b = {
      manifest: {
        name: 'beta',
        peerDependencies: { vue: '^3.0.0' },
      },
    }
    t.ok(
      compareByHasPeerDeps(a, b) < 0,
      'alpha should come before beta',
    )
    t.ok(
      compareByHasPeerDeps(b, a) > 0,
      'beta should come after alpha',
    )
  })

  t.test('handles empty peerDependencies object', async t => {
    const empty = { manifest: { peerDependencies: {} } }
    const withPeers = {
      manifest: { peerDependencies: { react: '^18.0.0' } },
    }
    t.equal(
      compareByHasPeerDeps(empty, withPeers),
      -1,
      'empty peers treated as no peers',
    )
  })

  t.test('falls back to spec name when no manifest name', async t => {
    const spec = Spec.parse('foo', '^1.0.0')
    const a = { spec }
    const b = { name: 'bar' }
    t.ok(
      compareByHasPeerDeps(a, b) > 0,
      'should use spec name for fallback',
    )
  })

  t.test('handles missing manifest', async t => {
    const a = { name: 'alpha' }
    const b = { name: 'beta' }
    t.ok(
      compareByHasPeerDeps(a, b) < 0,
      'should compare by name when no manifest',
    )
  })

  t.test('handles completely empty objects', async t => {
    const a = {}
    const b = {}
    t.equal(
      compareByHasPeerDeps(a, b),
      0,
      'should handle empty objects',
    )
  })
})

t.test('compareByType', async t => {
  t.test('sorts non-peer types before peer types', async t => {
    const prod = { type: 'prod', target: { name: 'foo' } }
    const peer = { type: 'peer', target: { name: 'foo' } }
    t.equal(
      compareByType(prod, peer),
      -1,
      'prod should come before peer',
    )
    t.equal(
      compareByType(peer, prod),
      1,
      'peer should come after prod',
    )
  })

  t.test('sorts non-peer types before peerOptional', async t => {
    const dev = { type: 'dev', target: { name: 'foo' } }
    const peerOpt = { type: 'peerOptional', target: { name: 'foo' } }
    t.equal(
      compareByType(dev, peerOpt),
      -1,
      'dev should come before peerOptional',
    )
    t.equal(
      compareByType(peerOpt, dev),
      1,
      'peerOptional should come after dev',
    )
  })

  t.test('sorts by name when both are non-peer types', async t => {
    const a = { type: 'prod', target: { name: 'alpha' } }
    const b = { type: 'dev', target: { name: 'beta' } }
    t.ok(compareByType(a, b) < 0, 'alpha should come before beta')
    t.ok(compareByType(b, a) > 0, 'beta should come after alpha')
    t.equal(compareByType(a, a), 0, 'same name equals 0')
  })

  t.test('sorts by name when both are peer types', async t => {
    const a = { type: 'peer', target: { name: 'alpha' } }
    const b = { type: 'peerOptional', target: { name: 'beta' } }
    t.ok(compareByType(a, b) < 0, 'alpha should come before beta')
    t.ok(compareByType(b, a) > 0, 'beta should come after alpha')
  })

  t.test('uses spec name when target is missing', async t => {
    const spec = Spec.parse('foo', '^1.0.0')
    const a = { type: 'prod', spec }
    const b = { type: 'prod', target: { name: 'bar' } }
    t.ok(compareByType(a, b) > 0, 'should use spec name for fallback')
  })

  t.test('handles missing name completely', async t => {
    const a = { type: 'prod' }
    const b = { type: 'dev' }
    t.equal(compareByType(a, b), 0, 'should handle missing names')
  })
})

t.test('getOrderedDependencies', async t => {
  t.test('returns empty array for empty input', async t => {
    const result = getOrderedDependencies([])
    t.strictSame(result, [], 'should return empty array')
  })

  t.test('sorts dependencies by type', async t => {
    const deps = [
      asDependency({
        spec: Spec.parse('peer-dep', '^1.0.0'),
        type: 'peer',
      }),
      asDependency({
        spec: Spec.parse('prod-dep', '^1.0.0'),
        type: 'prod',
      }),
      asDependency({
        spec: Spec.parse('dev-dep', '^1.0.0'),
        type: 'dev',
      }),
      asDependency({
        spec: Spec.parse('peer-opt-dep', '^1.0.0'),
        type: 'peerOptional',
      }),
    ]
    const result = getOrderedDependencies(deps)
    t.equal(result.length, 4, 'should have all dependencies')
    t.equal(
      result[0]?.spec.name,
      'dev-dep',
      'dev-dep should be first (non-peer, alphabetically)',
    )
    t.equal(
      result[1]?.spec.name,
      'prod-dep',
      'prod-dep should be second (non-peer, alphabetically)',
    )
    t.equal(
      result[2]?.spec.name,
      'peer-dep',
      'peer-dep should be third (peer type)',
    )
    t.equal(
      result[3]?.spec.name,
      'peer-opt-dep',
      'peer-opt-dep should be last',
    )
  })

  t.test('does not mutate original array', async t => {
    const deps = [
      asDependency({
        spec: Spec.parse('peer-dep', '^1.0.0'),
        type: 'peer',
      }),
      asDependency({
        spec: Spec.parse('prod-dep', '^1.0.0'),
        type: 'prod',
      }),
    ]
    const original = [...deps]
    getOrderedDependencies(deps)
    t.strictSame(deps, original, 'original array should not change')
  })
})

t.test('getNodeOrderedDependencies', async t => {
  t.test('returns empty array when node has no edges', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    })
    const graph = new Graph({
      projectRoot,
      mainManifest: {},
    })
    const result = getNodeOrderedDependencies(graph.mainImporter)
    t.strictSame(result, [], 'should return empty array')
  })

  t.test('returns ordered dependencies from edgesOut', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    })
    const graph = new Graph({
      projectRoot,
      mainManifest: {},
    })
    graph.mainImporter.edgesOut.set(
      'peer-dep',
      new Edge(
        'peer',
        Spec.parse('peer-dep', '^1.0.0'),
        graph.mainImporter,
      ),
    )
    graph.mainImporter.edgesOut.set(
      'prod-dep',
      new Edge(
        'prod',
        Spec.parse('prod-dep', '^1.0.0'),
        graph.mainImporter,
      ),
    )
    const result = getNodeOrderedDependencies(graph.mainImporter)
    t.equal(result.length, 2, 'should have 2 dependencies')
    t.equal(
      result[0]?.spec.name,
      'prod-dep',
      'prod should come before peer',
    )
    t.equal(result[1]?.spec.name, 'peer-dep', 'peer should be last')
  })

  t.test('includes dependencies from add option', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    })
    const graph = new Graph({
      projectRoot,
      mainManifest: {},
    })
    const addMap = Object.assign(
      new Map([
        [
          graph.mainImporter.id,
          new Map([
            [
              'new-dep',
              asDependency({
                spec: Spec.parse('new-dep', '^1.0.0'),
                type: 'prod',
              }),
            ],
          ]),
        ],
      ]),
      { modifiedDependencies: false },
    ) as AddImportersDependenciesMap
    const removeMap = Object.assign(new Map(), {
      modifiedDependencies: false,
    }) as RemoveImportersDependenciesMap
    const result = getNodeOrderedDependencies(graph.mainImporter, {
      add: addMap,
      remove: removeMap,
    })
    t.equal(result.length, 1, 'should have 1 dependency')
    t.equal(
      result[0]?.spec.name,
      'new-dep',
      'should include added dep',
    )
  })

  t.test('excludes dependencies from remove option', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    })
    const graph = new Graph({
      projectRoot,
      mainManifest: {},
    })
    graph.mainImporter.edgesOut.set(
      'to-remove',
      new Edge(
        'prod',
        Spec.parse('to-remove', '^1.0.0'),
        graph.mainImporter,
      ),
    )
    graph.mainImporter.edgesOut.set(
      'to-keep',
      new Edge(
        'prod',
        Spec.parse('to-keep', '^1.0.0'),
        graph.mainImporter,
      ),
    )
    const addMap = Object.assign(new Map(), {
      modifiedDependencies: false,
    }) as AddImportersDependenciesMap
    const removeMap = Object.assign(
      new Map([[graph.mainImporter.id, new Set(['to-remove'])]]),
      { modifiedDependencies: false },
    ) as RemoveImportersDependenciesMap
    const result = getNodeOrderedDependencies(graph.mainImporter, {
      add: addMap,
      remove: removeMap,
    })
    t.equal(result.length, 1, 'should have 1 dependency')
    t.equal(
      result[0]?.spec.name,
      'to-keep',
      'should only include kept dep',
    )
  })

  t.test('handles add and remove together', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    })
    const graph = new Graph({
      projectRoot,
      mainManifest: {},
    })
    graph.mainImporter.edgesOut.set(
      'existing',
      new Edge(
        'prod',
        Spec.parse('existing', '^1.0.0'),
        graph.mainImporter,
      ),
    )
    graph.mainImporter.edgesOut.set(
      'to-remove',
      new Edge(
        'dev',
        Spec.parse('to-remove', '^1.0.0'),
        graph.mainImporter,
      ),
    )
    const addMap = Object.assign(
      new Map([
        [
          graph.mainImporter.id,
          new Map([
            [
              'new-dep',
              asDependency({
                spec: Spec.parse('new-dep', '^1.0.0'),
                type: 'dev',
              }),
            ],
          ]),
        ],
      ]),
      { modifiedDependencies: false },
    ) as AddImportersDependenciesMap
    const removeMap = Object.assign(
      new Map([[graph.mainImporter.id, new Set(['to-remove'])]]),
      { modifiedDependencies: false },
    ) as RemoveImportersDependenciesMap
    const result = getNodeOrderedDependencies(graph.mainImporter, {
      add: addMap,
      remove: removeMap,
    })
    t.equal(result.length, 2, 'should have 2 dependencies')
    t.equal(
      result[0]?.spec.name,
      'existing',
      'should include existing dep',
    )
    t.equal(result[1]?.spec.name, 'new-dep', 'should include new dep')
  })

  t.test('updates existing dependency when added again', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    })
    const graph = new Graph({
      projectRoot,
      mainManifest: {},
    })
    graph.mainImporter.edgesOut.set(
      'dep',
      new Edge(
        'prod',
        Spec.parse('dep', '^1.0.0'),
        graph.mainImporter,
      ),
    )
    const addMap = Object.assign(
      new Map([
        [
          graph.mainImporter.id,
          new Map([
            [
              'dep',
              asDependency({
                spec: Spec.parse('dep', '^2.0.0'),
                type: 'dev',
              }),
            ],
          ]),
        ],
      ]),
      { modifiedDependencies: false },
    ) as AddImportersDependenciesMap
    const removeMap = Object.assign(new Map(), {
      modifiedDependencies: false,
    }) as RemoveImportersDependenciesMap
    const result = getNodeOrderedDependencies(graph.mainImporter, {
      add: addMap,
      remove: removeMap,
    })
    t.equal(result.length, 1, 'should have 1 dependency')
    t.equal(
      result[0]?.spec.bareSpec,
      '^2.0.0',
      'should use updated spec',
    )
    t.equal(result[0]?.type, 'dev', 'should use updated type')
  })

  t.test('handles undefined options', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    })
    const graph = new Graph({
      projectRoot,
      mainManifest: {},
    })
    graph.mainImporter.edgesOut.set(
      'dep',
      new Edge(
        'prod',
        Spec.parse('dep', '^1.0.0'),
        graph.mainImporter,
      ),
    )
    const result = getNodeOrderedDependencies(graph.mainImporter)
    t.equal(result.length, 1, 'should handle undefined options')
  })

  t.test(
    'ignores add/remove for different node when processing',
    async t => {
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'test',
          version: '1.0.0',
        }),
      })
      const graph = new Graph({
        projectRoot,
        mainManifest: {},
      })
      const otherNodeId = joinDepIDTuple(['file', 'other'])
      graph.mainImporter.edgesOut.set(
        'dep',
        new Edge(
          'prod',
          Spec.parse('dep', '^1.0.0'),
          graph.mainImporter,
        ),
      )
      const addMap = Object.assign(
        new Map([
          [
            otherNodeId,
            new Map([
              [
                'other-dep',
                asDependency({
                  spec: Spec.parse('other-dep', '^1.0.0'),
                  type: 'prod',
                }),
              ],
            ]),
          ],
        ]),
        { modifiedDependencies: false },
      ) as AddImportersDependenciesMap
      const removeMap = Object.assign(
        new Map([[otherNodeId, new Set(['other-dep'])]]),
        { modifiedDependencies: false },
      ) as RemoveImportersDependenciesMap
      const result = getNodeOrderedDependencies(graph.mainImporter, {
        add: addMap,
        remove: removeMap,
      })
      t.equal(
        result.length,
        1,
        'should only process own node dependencies',
      )
      t.equal(
        result[0]?.spec.name,
        'dep',
        'should not include deps from other nodes',
      )
    },
  )
})
