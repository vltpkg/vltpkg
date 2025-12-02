import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { asDependency } from '../../src/dependencies.ts'
import { build } from '../../src/ideal/build.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'
import type { DepIDTuple } from '@vltpkg/dep-id'
import type { Manifest } from '@vltpkg/types'
import type { LockfileEdgeKey } from '../../src/index.ts'
import type {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../../src/dependencies.ts'

const edgeKey = (from: DepIDTuple, to: string): LockfileEdgeKey =>
  `${joinDepIDTuple(from)} ${to}`

const packageInfo = {
  async manifest(spec: Spec) {
    switch (spec.name) {
      case 'foo':
        return {
          name: 'foo',
          version: '1.0.0',
          dist: {
            integrity:
              'sha512-URO90jLnKPqX+P7OLnJkiIQfMX4I6gEdGZ1T84drQLtRPw6uNKYLZfB6K3hjWIrj0VZB1kh2cTFdeq01i6XIYQ==',
          } as Manifest,
        }
      default:
        throw new Error('404 - ' + spec.name, { cause: { spec } })
    }
  },
} as PackageInfoClient

t.test('build from lockfile', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
      },
    }),
    'vlt-lock.json': JSON.stringify({
      options: {},
      nodes: {
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
          0,
          'foo',
          'sha512-URO90jLnKPqX+P7OLnJkiIQfMX4I6gEdGZ1T84drQLtRPw6uNKYLZfB6K3hjWIrj0VZB1kh2cTFdeq01i6XIYQ==',
        ],
      },
      edges: {
        [edgeKey(['file', '.'], 'foo')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      },
    }),
  })

  const graph = await build({
    scurry: new PathScurry(projectRoot),
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    packageInfo,
    projectRoot,
    add: new Map([
      [joinDepIDTuple(['file', '.']), new Map()],
    ]) as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(
    objectLikeOutput(graph),
    'should build an ideal tree starting from a virtual graph',
  )
})

t.test('build from actual files', async t => {
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

  const graph = await build({
    scurry: new PathScurry(projectRoot),
    monorepo: Monorepo.maybeLoad(projectRoot),
    packageJson: new PackageJson(),
    packageInfo,
    projectRoot,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(
    objectLikeOutput(graph),
    'should build an ideal tree starting from a virtual graph',
  )
})

t.test('add with file DepID not in graph throws', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
    'vlt-lock.json': JSON.stringify({
      options: {},
      nodes: {},
      edges: {},
    }),
  })

  await t.rejects(
    build({
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      add: new Map([
        [
          joinDepIDTuple(['file', 'packages/unknown']),
          new Map([
            [
              'foo',
              asDependency({
                spec: Spec.parse('foo@^1.0.0'),
                type: 'prod',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
      remove: new Map() as RemoveImportersDependenciesMap,
      remover: new RollbackRemove(),
    }),
    {
      message:
        'The current working dir is not a dependency of this project',
    },
  )
})

t.test('remove with file DepID not in graph throws', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
    'vlt-lock.json': JSON.stringify({
      options: {},
      nodes: {},
      edges: {},
    }),
  })

  await t.rejects(
    build({
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      add: new Map() as AddImportersDependenciesMap,
      remove: new Map([
        [
          joinDepIDTuple(['file', 'packages/unknown']),
          new Set(['foo']),
        ],
      ]) as RemoveImportersDependenciesMap,
      remover: new RollbackRemove(),
    }),
    {
      message:
        'The current working dir is not a dependency of this project',
    },
  )
})
