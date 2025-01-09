import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { inspect } from 'node:util'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { load } from '../../src/actual/load.js'
import {
  asDependency,
  type AddImportersDependenciesMap,
} from '../../src/dependencies.js'
import { Graph } from '../../src/graph.js'
import { removeSatisfiedSpecs } from '../../src/ideal/remove-satisfied-specs.js'

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${this}}`
  },
})

t.test('empty graph and add parameters', async t => {
  const graph = new Graph({
    mainManifest: {},
    projectRoot: t.testdirName,
  })
  const add = new Map() as AddImportersDependenciesMap
  removeSatisfiedSpecs({ add, graph })
  t.matchSnapshot(add, 'should return an empty map')
})

t.test('graph with an actual node', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }),
    node_modules: {
      '.vlt': {
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: {
          node_modules: {
            foo: {
              'package.json': JSON.stringify({
                name: 'foo',
                version: '1.0.0',
              }),
            },
          },
        },
      },
      foo: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']) +
          '/node_modules/foo',
      ),
    },
  })

  await t.test('add spec is satisfied', async t => {
    const graph = load({
      projectRoot,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
    })
    const add = new Map([
      [
        joinDepIDTuple(['file', '.']),
        new Map(
          Object.entries({
            foo: asDependency({
              spec: Spec.parse('foo@^1.0.0'),
              type: 'prod',
            }),
          }),
        ),
      ],
    ]) as AddImportersDependenciesMap
    removeSatisfiedSpecs({ add, graph })
    t.matchSnapshot(add, 'should return an empty map')
  })

  await t.test('add a new spec item', async t => {
    const graph = load({
      projectRoot,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
    })
    const add = new Map([
      [
        joinDepIDTuple(['file', '.']),
        new Map(
          Object.entries({
            bar: asDependency({
              spec: Spec.parse('bar@^1.0.0'),
              type: 'prod',
            }),
          }),
        ),
      ],
    ]) as AddImportersDependenciesMap
    removeSatisfiedSpecs({ add, graph })
    t.matchSnapshot(
      inspect(add, { depth: Infinity }),
      'should return the new item',
    )
  })

  await t.test('update existing spec', async t => {
    const graph = load({
      projectRoot,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
    })
    const add = new Map([
      [
        joinDepIDTuple(['file', '.']),
        new Map(
          Object.entries({
            foo: asDependency({
              spec: Spec.parse('foo@^2.0.0'),
              type: 'prod',
            }),
          }),
        ),
      ],
    ]) as AddImportersDependenciesMap
    removeSatisfiedSpecs({ add, graph })
    t.matchSnapshot(
      inspect(add, { depth: Infinity }),
      'should return the update item',
    )
  })

  await t.test('registry tag', async t => {
    const graph = load({
      projectRoot,
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
    })
    const add = new Map([
      [
        joinDepIDTuple(['file', '.']),
        new Map(
          Object.entries({
            foo: asDependency({
              spec: Spec.parse('foo@latest'),
              type: 'prod',
            }),
          }),
        ),
      ],
    ]) as AddImportersDependenciesMap
    removeSatisfiedSpecs({ add, graph })
    t.matchSnapshot(
      inspect(add, { depth: Infinity }),
      'should not return registry tag item if something already satisfies it',
    )
  })

  await t.test('refer to missing importer', async t => {
    const graph = new Graph({
      mainManifest: {},
      projectRoot: t.testdirName,
    })
    const add = new Map([
      // this workspace id does not exist in the given graph
      [
        joinDepIDTuple(['workspace', 'packages/a']),
        new Map(
          Object.entries({
            baz: asDependency({
              spec: Spec.parse('baz@^1.0.0'),
              type: 'prod',
            }),
          }),
        ),
      ],
    ]) as AddImportersDependenciesMap
    t.throws(
      () => removeSatisfiedSpecs({ add, graph }),
      /Referred importer node id could not be found/,
      'should throw an missing importer id error',
    )
  })
})
