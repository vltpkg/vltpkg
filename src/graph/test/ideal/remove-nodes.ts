// write tap tests for removing a node from the graph
import t from 'tap'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { removeNodes } from '../../src/ideal/remove-nodes.ts'
import { Graph } from '../../src/graph.ts'
import type { RemoveImportersDependenciesMap } from '../../src/dependencies.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('removeNodes', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot: t.testdirName,
  })

  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )

  const remove: RemoveImportersDependenciesMap = Object.assign(
    new Map([[graph.mainImporter.id, new Set(['foo'])]]),
    { modifiedDependencies: true },
  )
  removeNodes({
    graph,
    remove,
  })

  t.matchSnapshot(
    graph.toJSON(),
    'should remove the node and edge from the graph',
  )
})

t.test('missing importer', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot: t.testdirName,
  })
  const remove: RemoveImportersDependenciesMap = Object.assign(
    new Map([
      [joinDepIDTuple(['workspace', 'bar']), new Set(['foo'])],
    ]),
    { modifiedDependencies: true },
  )

  t.throws(
    () => removeNodes({ graph, remove }),
    /Could not find importer/,
    'should throw an error when the importer is not found',
  )
})
