import t from 'tap'
import { inspect } from 'util'
import { Diff } from '../src/diff.js'
import { loadObject } from '../src/lockfile/load.js'

t.test('diff two graphs', async t => {
  const projectRoot = t.testdir({
    'vlt-workspaces.json': JSON.stringify({
      packages: ['./packages/*'],
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
      registries: {
        npm: 'https://registry.npmjs.org',
        custom: 'https://registry.example.com',
      },
      nodes: {
        'file;.': [0, 'my-project'],
        ';;foo@1.0.0': [
          0,
          'foo',
          'sha512-foofoofoo==',
          null,
          './node_modules/.pnpm/foo@1.0.0/node_modules/foo',
        ],
        ';;a@1.0.0': [0, 'foo', 'sha512-aaaaaaaaa=='],
        ';;bar@1.0.0': [
          0,
          'bar',
          'sha512-barbarbar==',
          'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        ],
        ';;baz@1.0.0': [
          0,
          'baz',
          'sha512-bazbazbaz==',
          'https://registry.example.com/baz/-/baz-1.0.0.tgz',
        ],
      },
      edges: {
        'file;. foo': 'prod ^1.0.0 ;;foo@1.0.0',
        'file;. a': 'prod ^1.0.0 ;;a@1.0.0',
        'file;. bar': 'prod ^1.0.0 ;;bar@1.0.0',
        ';;bar@1.0.0 baz': 'prod ^1.0.0 ;;baz@1.0.0',
      },
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
      registries: {
        npm: 'https://registry.npmjs.org',
        custom: 'https://registry.example.com',
      },
      nodes: {
        'file;.': [0, 'my-project'],
        ';;foo@1.0.0': [0, 'foo', 'sha512-foofoofoo=='],
        ';;b@1.0.0': [0, 'foo', 'sha512-bbbbbbbbb=='],
        ';;c@1.0.0': [0, 'foo', 'sha512-ccccccccc=='],
        ';;bar@1.0.0': [
          0,
          'bar',
          'sha512-barbarbar==',
          'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        ],
        ';;baz@1.0.1': [
          0,
          'baz',
          'sha512-baz101baz101baz101==',
          'https://registry.example.com/baz/-/baz-1.0.1.tgz',
        ],
        ';;ooo@1.0.1': [
          0,
          'ooo',
          'sha512-ooo420ooo420ooo420==',
          'https://registry.example.com/ooo/-/ooo-1.0.1.tgz',
        ],
      },
      edges: {
        'file;. foo': 'prod ^1.0.0 ;;foo@1.0.0',
        'file;. b': 'prod ^1.0.0 ;;b@1.0.0',
        ';;b@1.0.0 c': 'prod ^1.0.0 ;;c@1.0.0',
        'file;. bar': 'prod ^1.0.0 ;;bar@1.0.0',
        ';;bar@1.0.0 baz': 'prod ^1.0.1 ;;baz@1.0.1',
        ';;bar@1.0.0 ooo': 'optional ^1.0.1 ;;ooo@1.0.1',
      },
    },
  )

  const diff = new Diff(graphA, graphB)
  t.matchSnapshot(inspect(diff, { colors: true }), 'diff with color')
  t.matchSnapshot(inspect(diff, { colors: false }), 'diff no color')
})
