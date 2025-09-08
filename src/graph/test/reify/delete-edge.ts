import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { Spec } from '@vltpkg/spec'
import { statSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Test } from 'tap'
import { Edge } from '../../src/edge.ts'
import { Node } from '../../src/node.ts'
import type { GraphLike } from '@vltpkg/types'

const fooManifest = {
  name: 'foo',
  version: '1.2.3',
  dependencies: { bar: '' },
}

const barManifest = {
  name: 'bar',
  version: '1.2.3',
  bin: './bar.js',
}

const mockRemover = {
  rm: (path: string) => rm(path, { recursive: true, force: true }),
  confirm() {},
  rollback() {},
} as unknown as RollbackRemove

const vltInstallFixture = (t: Test) =>
  t.testdir({
    node_modules: {
      '.vlt': {
        [joinDepIDTuple(['registry', '', 'foo@1.2.3'])]: {
          node_modules: {
            '.bin': {
              bar: t.fixture('symlink', '../bar/bar.js'),
              'bar.cmd': 'cmd shim',
              'bar.ps1': 'powershell shim',
            },
            foo: {
              'package.json': JSON.stringify(fooManifest),
            },
            bar: t.fixture(
              'symlink',
              '../../' +
                joinDepIDTuple(['registry', '', 'bar@1.2.3']) +
                '/node_modules/bar',
            ),
          },
        },
        [joinDepIDTuple(['registry', '', 'bar@1.2.3'])]: {
          node_modules: {
            bar: {
              'package.json': JSON.stringify(barManifest),
              'bar.js': '#!/usr/local/bin node\nconsole.log("bar")',
            },
          },
        },
      },
      foo: t.fixture(
        'symlink',
        './.vlt/' +
          joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
          '/node_modules/foo',
      ),
      bar: t.fixture(
        'symlink',
        './.vlt/' +
          joinDepIDTuple(['registry', '', 'bar@1.2.3']) +
          '/node_modules/bar',
      ),
      '.bin': {
        bar: t.fixture('symlink', '../bar/bar.js'),
        'bar.cmd': 'cmd shim',
        'bar.ps1': 'powershell shim',
      },
    },
  })

t.test('posix', async t => {
  t.intercept(process, 'platform', { value: 'linux' })

  const { deleteEdge } = await t.mockImport<
    typeof import('../../src/reify/delete-edge.ts')
  >('../../src/reify/delete-edge.ts')

  const projectRoot = vltInstallFixture(t)
  const opts = {
    projectRoot,
    graph: {} as GraphLike,
  }
  // gutcheck
  statSync(projectRoot + '/node_modules/.bin/bar')
  statSync(projectRoot + '/node_modules/.bin/bar.cmd')
  statSync(projectRoot + '/node_modules/.bin/bar.ps1')
  const fooNM =
    projectRoot +
    '/node_modules/.vlt/' +
    joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
    '/node_modules'
  statSync(fooNM + '/bar')
  statSync(fooNM + '/.bin/bar')
  statSync(fooNM + '/.bin/bar.cmd')
  statSync(fooNM + '/.bin/bar.ps1')
  const edge = new Edge(
    'prod',
    Spec.parse('bar@'),
    new Node(
      opts,
      joinDepIDTuple(['registry', '', 'foo@1.2.3']),
      fooManifest,
    ),
    new Node(
      opts,
      joinDepIDTuple(['registry', '', 'bar@1.2.3']),
      barManifest,
    ),
  )
  const scurry = new PathScurry(projectRoot)

  await deleteEdge(edge, scurry, mockRemover)

  statSync(projectRoot + '/node_modules/.bin/bar')
  statSync(projectRoot + '/node_modules/.bin/bar.cmd')
  statSync(projectRoot + '/node_modules/.bin/bar.ps1')
  t.throws(() => statSync(fooNM + '/bar'))
  t.throws(() => statSync(fooNM + '/.bin/bar'))
  // these not touched, because not windows
  statSync(fooNM + '/.bin/bar.cmd')
  statSync(fooNM + '/.bin/bar.ps1')
})

t.test('win32', async t => {
  t.intercept(process, 'platform', { value: 'win32' })

  const { deleteEdge } = await t.mockImport<
    typeof import('../../src/reify/delete-edge.ts')
  >('../../src/reify/delete-edge.ts')

  const projectRoot = vltInstallFixture(t)
  // gutcheck
  statSync(projectRoot + '/node_modules/.bin/bar')
  statSync(projectRoot + '/node_modules/.bin/bar.cmd')
  statSync(projectRoot + '/node_modules/.bin/bar.ps1')
  const fooNM =
    projectRoot +
    '/node_modules/.vlt/' +
    joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
    '/node_modules'
  statSync(fooNM + '/bar')
  statSync(fooNM + '/.bin/bar')
  statSync(fooNM + '/.bin/bar.cmd')
  statSync(fooNM + '/.bin/bar.ps1')
  const opts = {
    projectRoot,
    graph: {} as GraphLike,
  }
  const edge = new Edge(
    'prod',
    Spec.parse('bar@'),
    new Node(
      opts,
      joinDepIDTuple(['registry', '', 'foo@1.2.3']),
      fooManifest,
    ),
    new Node(
      opts,
      joinDepIDTuple(['registry', '', 'bar@1.2.3']),
      barManifest,
    ),
  )
  const scurry = new PathScurry(projectRoot)

  await deleteEdge(edge, scurry, mockRemover)

  statSync(projectRoot + '/node_modules/.bin/bar')
  statSync(projectRoot + '/node_modules/.bin/bar.cmd')
  statSync(projectRoot + '/node_modules/.bin/bar.ps1')
  t.throws(() => statSync(fooNM + '/bar'))
  t.throws(() => statSync(fooNM + '/.bin/bar'))
  // these not touched, because not windows
  t.throws(() => statSync(fooNM + '/.bin/bar.cmd'))
  t.throws(() => statSync(fooNM + '/.bin/bar.ps1'))
})
