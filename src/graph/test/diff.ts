import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID, DepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import { inspect } from 'node:util'
import { Diff } from '../src/diff.ts'
import type {
  Graph,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileNode,
} from '../src/index.ts'
import { loadObject } from '../src/lockfile/load.ts'

const edgeKey = (from: DepIDTuple, to: string): LockfileEdgeKey =>
  (joinDepIDTuple(from) + ' ' + to) as LockfileEdgeKey

t.test('graphs must have same projectRoot', t => {
  const a = { projectRoot: '/some/path' } as unknown as Graph
  const b = { projectRoot: '/other/path' } as unknown as Graph
  t.throws(() => new Diff(a, b), {
    message: 'projectRoot mismatch in Graph diff',
  })
  t.end()
})

t.test('diff two graphs', async t => {
  const projectRoot = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: {
        packages: ['./packages/*'],
      },
    }),
    packages: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'b',
          version: '1.0.0',
          dependencies: {
            c: '^1.0.0',
          },
        }),
      },
    },
  })

  // foo: no changes
  // a: in graphA, not in graphB
  // b: in graphB, not in graphA
  // bar: edge changes
  // baz: change version

  const graphA = loadObject(
    {
      projectRoot,
      mainManifest: {
        name: 'foo',
        version: '1.2.3',
      },
    },
    {
      options: {
        registries: {
          npm: 'https://registry.npmjs.org/',
          custom: 'https://registry.example.com',
        },
      },
      nodes: {
        [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
          0,
          'foo',
          'sha512-foofoofoo==',
          null,
          './node_modules/.pnpm/foo@1.0.0/node_modules/foo',
        ],
        [joinDepIDTuple(['registry', '', 'a@1.0.0'])]: [
          0,
          'foo',
          'sha512-aaaaaaaaa==',
        ],
        [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
          0,
          'bar',
          'sha512-barbarbar==',
          'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        ],
        [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
          0,
          'baz',
          'sha512-bazbazbaz==',
          'https://registry.example.com/baz/-/baz-1.0.0.tgz',
        ],
      } as Record<DepID, LockfileNode>,
      edges: {
        [edgeKey(['file', '.'], 'foo')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
        [edgeKey(['file', '.'], 'a')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'a@1.0.0']),
        [edgeKey(['file', '.'], 'bar')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'bar@1.0.0']),
        [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'baz@1.0.0']),
      } as LockfileEdges,
    },
  )

  const graphB = loadObject(
    {
      projectRoot,
      mainManifest: {
        name: 'foo',
        version: '1.2.3',
      },
    },
    {
      options: {
        registries: {
          npm: 'https://registry.npmjs.org/',
          custom: 'https://registry.example.com',
        },
      },
      nodes: {
        [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
          0,
          'foo',
          'sha512-foofoofoo==',
        ],
        [joinDepIDTuple(['registry', '', 'b@1.0.0'])]: [
          0,
          'foo',
          'sha512-bbbbbbbbb==',
        ],
        [joinDepIDTuple(['registry', '', 'c@1.0.0'])]: [
          0,
          'foo',
          'sha512-ccccccccc==',
        ],
        [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
          0,
          'bar',
          'sha512-barbarbar==',
          'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        ],
        [joinDepIDTuple(['registry', '', 'baz@1.0.1'])]: [
          0,
          'baz',
          'sha512-baz101baz101baz101==',
          'https://registry.example.com/baz/-/baz-1.0.1.tgz',
        ],
        [joinDepIDTuple(['registry', '', 'ooo@1.0.1'])]: [
          0,
          'ooo',
          'sha512-ooo420ooo420ooo420==',
          'https://registry.example.com/ooo/-/ooo-1.0.1.tgz',
        ],
      } as Record<DepID, LockfileNode>,
      edges: {
        [edgeKey(['file', '.'], 'foo')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
        [edgeKey(['file', '.'], 'b')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'b@1.0.0']),
        [edgeKey(['registry', '', 'b@1.0.0'], 'c')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'c@1.0.0']),
        [edgeKey(['file', '.'], 'bar')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'bar@1.0.0']),
        [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
          'prod ^1.0.1 ' +
          joinDepIDTuple(['registry', '', 'baz@1.0.1']),
        [edgeKey(['registry', '', 'bar@1.0.0'], 'ooo')]:
          'optional ^1.0.1 ' +
          joinDepIDTuple(['registry', '', 'ooo@1.0.1']),
      } as LockfileEdges,
    },
  )

  const diff = new Diff(graphA, graphB)
  t.matchSnapshot(inspect(diff, { colors: true }), 'diff with color')
  t.matchSnapshot(inspect(diff, { colors: false }), 'diff no color')
})
