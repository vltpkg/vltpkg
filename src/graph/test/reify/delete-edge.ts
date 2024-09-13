import { joinDepIDTuple } from '@vltpkg/dep-id'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Spec } from '@vltpkg/spec'
import { statSync } from 'fs'
import { rm } from 'fs/promises'
import { PathScurry } from 'path-scurry'
import t, { Test } from 'tap'
import { Edge } from '../../src/edge.js'
import { Node } from '../../src/node.js'
import { GraphLike } from '../../src/types.js'

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
              'bar.pwsh': 'powershell shim',
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
        'bar.pwsh': 'powershell shim',
      },
    },
  })

t.test('posix', async t => {
  t.intercept(process, 'platform', { value: 'linux' })

  const { deleteEdge } = await t.mockImport<
    typeof import('../../src/reify/delete-edge.js')
  >('../../src/reify/delete-edge.js')

  const projectRoot = vltInstallFixture(t)
  const opts = {
    projectRoot,
    graph: {} as GraphLike,
  }
  // gutcheck
  statSync(projectRoot + '/node_modules/.bin/bar')
  statSync(projectRoot + '/node_modules/.bin/bar.cmd')
  statSync(projectRoot + '/node_modules/.bin/bar.pwsh')
  const fooNM =
    projectRoot +
    '/node_modules/.vlt/' +
    joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
    '/node_modules'
  statSync(fooNM + '/bar')
  statSync(fooNM + '/.bin/bar')
  statSync(fooNM + '/.bin/bar.cmd')
  statSync(fooNM + '/.bin/bar.pwsh')
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
  statSync(projectRoot + '/node_modules/.bin/bar.pwsh')
  t.throws(() => statSync(fooNM + '/bar'))
  t.throws(() => statSync(fooNM + '/.bin/bar'))
  // these not touched, because not windows
  statSync(fooNM + '/.bin/bar.cmd')
  statSync(fooNM + '/.bin/bar.pwsh')
})

t.test('win32', async t => {
  t.intercept(process, 'platform', { value: 'win32' })

  const { deleteEdge } = await t.mockImport<
    typeof import('../../src/reify/delete-edge.js')
  >('../../src/reify/delete-edge.js')

  const projectRoot = vltInstallFixture(t)
  // gutcheck
  statSync(projectRoot + '/node_modules/.bin/bar')
  statSync(projectRoot + '/node_modules/.bin/bar.cmd')
  statSync(projectRoot + '/node_modules/.bin/bar.pwsh')
  const fooNM =
    projectRoot +
    '/node_modules/.vlt/' +
    joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
    '/node_modules'
  statSync(fooNM + '/bar')
  statSync(fooNM + '/.bin/bar')
  statSync(fooNM + '/.bin/bar.cmd')
  statSync(fooNM + '/.bin/bar.pwsh')
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
  statSync(projectRoot + '/node_modules/.bin/bar.pwsh')
  t.throws(() => statSync(fooNM + '/bar'))
  t.throws(() => statSync(fooNM + '/.bin/bar'))
  // these not touched, because not windows
  t.throws(() => statSync(fooNM + '/.bin/bar.cmd'))
  t.throws(() => statSync(fooNM + '/.bin/bar.pwsh'))
})
