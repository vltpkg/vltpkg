import t from 'tap'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec, kCustomInspect } from '@vltpkg/spec/browser'
import { load } from '../../src/transfer-data/load.ts'
import type { TransferData } from '../../src/transfer-data/load.ts'

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${String(this)}}`
  },
})

const transferData: TransferData = {
  importers: [
    {
      importer: true,
      id: joinDepIDTuple(['file', '.']),
      name: 'my-project',
      version: '1.0.0',
      location: '.',
      manifest: {
        name: 'my-project',
        version: '1.0.0',
      },
      projectRoot: '/path/to/project',
      dev: false,
      optional: false,
    },
  ],
  lockfile: {
    lockfileVersion: 0,
    options: {
      registries: {
        custom: 'http://example.com',
      },
    },
    nodes: {
      '··bar@1.0.0': [
        3,
        'bar',
        null,
        null,
        null,
        {
          name: 'bar',
          version: '1.0.0',
        },
      ],
      '··foo@1.0.0': [
        2,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        null,
        'node_modules/.pnpm/foo@1.0.0/node_modules/foo',
        {
          name: 'foo',
          version: '1.0.0',
          dist: {
            integrity:
              'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
          },
        },
      ],
      '·custom·baz@1.0.0': [
        1,
        'baz',
        null,
        'http://example.com/baz.tgz',
        null,
        {
          name: 'baz',
          version: '1.0.0',
          dist: {
            tarball: 'http://example.com/baz.tgz',
          },
        },
      ],
    },
    edges: {
      'file·. foo': 'prod ^1.0.0 || 1.2.3 || 2 ··foo@1.0.0',
      'file·. baz': 'prod custom:baz@^1.0.0 ·custom·baz@1.0.0',
      '··foo@1.0.0 bar': 'prod ^1.0.0 ··bar@1.0.0',
    },
  },
  projectInfo: {
    tools: ['vlt'],
    vltInstalled: true,
  },
  securityArchive: undefined,
}

t.test('load graph', async () => {
  const result = load(transferData)
  t.matchSnapshot(
    humanReadableOutput(
      {
        edges: [...result.graph.edges],
        nodes: [...result.graph.nodes.values()],
        importers: result.graph.importers,
      },
      { colors: false },
    ),
  )
})

t.test('load graph with confused manifest', async () => {
  const transferDataWithConfused: TransferData = {
    ...transferData,
    lockfile: {
      ...transferData.lockfile,
      nodes: {
        ...transferData.lockfile.nodes,
        '··confused@1.0.0': [
          0,
          'confused',
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
          null,
          'node_modules/.pnpm/confused@1.0.0/node_modules/confused',
          {
            name: 'confused',
            version: '1.0.0',
          },
          {
            name: 'test',
            version: '1.0.0',
          },
        ],
      },
      edges: {
        ...transferData.lockfile.edges,
        'file·. confused': 'prod ^1.0.0 ··confused@1.0.0',
      },
    },
  }
  const result = load(transferDataWithConfused)
  const confusedNode = result.graph.nodes.get('··confused@1.0.0')
  t.ok(confusedNode)
  t.ok(confusedNode?.confused)
  t.strictSame(confusedNode?.manifest?.name, 'confused')
  t.strictSame(confusedNode?.rawManifest?.name, 'test')
  t.matchSnapshot(
    humanReadableOutput(
      {
        edges: [...result.graph.edges],
        nodes: [...result.graph.nodes.values()],
        importers: result.graph.importers,
      },
      { colors: false },
    ),
  )
})

t.test('load graph with SecurityArchive', async () => {
  const transferDataWithSecurity: TransferData = {
    ...transferData,
    securityArchive: { some: 'data' },
  }

  const { load } = await t.mockImport<
    typeof import('../../src/transfer-data/load.ts')
  >('../../src/transfer-data/load.ts', {
    '@vltpkg/security-archive/browser': {
      SecurityArchive: {
        load: (_data: any) => ({
          has: (id: string) => id.includes('foo'),
          get: (_id: string) => ({ score: 80 }),
          set: () => {},
          delete: () => true,
          clear: () => {},
          ok: true,
        }),
      },
    },
  })

  const result = load(transferDataWithSecurity)
  t.ok(result.securityArchive)
  t.strictSame(result.securityArchive?.ok, false) // Should be false because bar node doesn't match
})

t.test(
  'load graph with SecurityArchive all nodes valid',
  async () => {
    const transferDataWithSecurity: TransferData = {
      ...transferData,
      securityArchive: { some: 'data' },
    }

    const { load } = await t.mockImport<
      typeof import('../../src/transfer-data/load.ts')
    >('../../src/transfer-data/load.ts', {
      '@vltpkg/security-archive/browser': {
        SecurityArchive: {
          load: (_data: any) => ({
            has: () => true, // All nodes are valid
            get: (_id: string) => ({ score: 90 }),
            set: () => {},
            delete: () => true,
            clear: () => {},
            ok: true,
          }),
        },
      },
    })

    const result = load(transferDataWithSecurity)
    t.ok(result.securityArchive)
    t.strictSame(result.securityArchive?.ok, true)
  },
)

t.test('load graph without SecurityArchive class', async () => {
  const transferDataWithSecurity: TransferData = {
    ...transferData,
    securityArchive: { some: 'data' },
  }

  const { load } = await t.mockImport<
    typeof import('../../src/transfer-data/load.ts')
  >('../../src/transfer-data/load.ts', {
    '@vltpkg/security-archive/browser': {
      SecurityArchive: {
        load: (_data: any) => undefined, // Simulate SecurityArchive.load returning undefined
      },
    },
  })

  const result = load(transferDataWithSecurity)
  t.notOk(result.securityArchive)
})

t.test('load graph with multiple importers', async () => {
  const multiImporterData: TransferData = {
    ...transferData,
    importers: [
      ...transferData.importers,
      {
        importer: true,
        id: joinDepIDTuple(['workspace', 'workspace-a']),
        name: 'workspace-a',
        version: '1.0.0',
        location: 'packages/a',
        manifest: {
          name: 'workspace-a',
          version: '1.0.0',
        },
        integrity: 'sha512-example',
        resolved: 'file:packages/a',
        dev: true,
        optional: true,
      },
    ],
  }

  const result = load(multiImporterData)
  t.strictSame(result.graph.importers.size, 2)

  const workspaceNode = [...result.graph.importers].find(
    n => n.name === 'workspace-a',
  )
  t.ok(workspaceNode)
  t.strictSame(workspaceNode?.location, 'packages/a')
})

t.test('load graph without projectRoot', async () => {
  const baseImporter = transferData.importers[0]
  if (!baseImporter) {
    t.fail('Base importer not found')
    return
  }

  const noProjectRootData: TransferData = {
    ...transferData,
    importers: [
      {
        importer: true,
        id: baseImporter.id,
        name: baseImporter.name,
        version: baseImporter.version,
        location: baseImporter.location,
        manifest: baseImporter.manifest,
        projectRoot: undefined,
        dev: false,
        optional: false,
      },
    ],
  }

  const result = load(noProjectRootData)
  t.strictSame(result.graph.projectRoot, '')
})

t.test('node serialization methods', async () => {
  const result = load(transferData)
  const fooNode = result.graph.nodes.get('··foo@1.0.0')
  t.ok(fooNode)

  if (fooNode) {
    // Test toJSON method
    const json = fooNode.toJSON()
    t.ok(json)
    t.strictSame(json.id, '··foo@1.0.0')
    t.strictSame(json.name, 'foo')
    t.strictSame(json.version, '1.0.0')

    // Test toString method
    const str = fooNode.toString()
    t.type(str, 'string')
    t.ok(str.includes('foo'))
  }

  // Test importer node toJSON (different implementation)
  const importer = [...result.graph.importers][0]
  if (importer) {
    const importerJson = importer.toJSON()
    t.ok(importerJson)
    t.strictSame(importerJson.id, importer.id)
    t.strictSame(importerJson.importer, true)
    t.strictSame(importerJson.confused, false)

    // Test importer toString
    const importerStr = importer.toString()
    t.type(importerStr, 'string')
  }
})

t.test('confused node serialization', async () => {
  const transferDataWithConfused: TransferData = {
    ...transferData,
    lockfile: {
      ...transferData.lockfile,
      nodes: {
        ...transferData.lockfile.nodes,
        '··confused@1.0.0': [
          0,
          'confused',
          null,
          null,
          null,
          {
            name: 'confused',
            version: '1.0.0',
          },
          {
            name: 'raw-confused',
            version: '1.0.0',
          },
        ],
      },
    },
  }

  const result = load(transferDataWithConfused)
  const confusedNode = result.graph.nodes.get('··confused@1.0.0')
  t.ok(confusedNode)

  if (confusedNode) {
    // Test toJSON with rawManifest
    const json = confusedNode.toJSON()
    t.ok(json.rawManifest)
    if (json.rawManifest) {
      t.strictSame(json.rawManifest.name, 'raw-confused')
    }
    t.strictSame(json.confused, true)
  }
})

t.test('edge replacement logic', async () => {
  const result = load(transferData)
  const graph = result.graph
  const fooNode = graph.nodes.get('··foo@1.0.0')
  const barNode = graph.nodes.get('··bar@1.0.0')
  const importer = [...graph.importers][0]

  t.ok(fooNode)
  t.ok(barNode)
  t.ok(importer)

  if (fooNode && barNode && importer) {
    // Create a spec for testing
    const spec = Spec.parse('test-pkg', '^1.0.0', result.specOptions)

    // Add an edge
    const edge1 = graph.addEdge('prod', spec, importer, fooNode)
    t.ok(edge1)

    // Add same edge again - should return existing edge
    const edge2 = graph.addEdge('prod', spec, importer, fooNode)
    t.strictSame(edge1, edge2)

    // Add edge with same spec but different target - should update target
    const edge3 = graph.addEdge('prod', spec, importer, barNode)
    t.strictSame(edge3.to, barNode)
    t.ok(barNode.edgesIn.has(edge3))

    // Add edge with same spec but different type - should replace edge
    const edge4 = graph.addEdge('dev', spec, importer, barNode)
    t.strictSame(edge4.type, 'dev')
    t.not(edge4, edge3)
  }
})

t.test('node creation error cases', async () => {
  const result = load(transferData)
  const graph = result.graph

  // Test addNode with missing id
  t.throws(() => {
    graph.addNode(undefined as any, {
      name: 'test',
      version: '1.0.0',
    })
  }, /id is required/)

  // Test addNode with missing manifest
  t.throws(() => {
    graph.addNode('test-id' as any, undefined as any)
  }, /manifest is required/)
})

t.test('node without name handling', async () => {
  const dataWithNamelessNode: TransferData = {
    ...transferData,
    lockfile: {
      ...transferData.lockfile,
      nodes: {
        ...transferData.lockfile.nodes,
        '··nameless@1.0.0': [
          0,
          null, // No name
          null,
          null,
          null,
          {
            version: '1.0.0', // No name in manifest either
          },
        ],
      },
    },
  }

  const result = load(dataWithNamelessNode)
  const namelessNode = result.graph.nodes.get('··nameless@1.0.0')
  t.ok(namelessNode)

  // Should handle nameless nodes gracefully
  t.notOk(result.graph.nodesByName.has(''))
})

t.test('maybeSetConfusedManifest method', async () => {
  const result = load(transferData)
  const fooNode = result.graph.nodes.get('··foo@1.0.0')
  t.ok(fooNode)

  if (fooNode) {
    // Create a spec for testing
    const spec = Spec.parse('foo', '^1.0.0', result.specOptions)

    // Test maybeSetConfusedManifest (it's a no-op in our implementation)
    fooNode.maybeSetConfusedManifest(spec)
    t.notOk(fooNode.confused) // Should remain unchanged
  }
})

t.test('setResolved method', async () => {
  const result = load(transferData)
  const fooNode = result.graph.nodes.get('··foo@1.0.0')
  t.ok(fooNode)

  if (fooNode) {
    // Test setResolved method (it's a no-op in our implementation)
    fooNode.setResolved()
    // Method should complete without error
    t.pass('setResolved method executed')
  }
})
