import t from 'tap'
import type { DepID } from '@vltpkg/dep-id'
import type { LockfileData } from '@vltpkg/graph'
import { deployLockfile } from '../src/deploy-lockfile.ts'

const app = 'workspace~apps+app' as DepID
const lib = 'workspace~libs+lib' as DepID
const tool = 'workspace~libs+tool' as DepID

const data = (
  edges: LockfileData['edges'],
  nodes: LockfileData['nodes'] = {},
): LockfileData => ({
  lockfileVersion: 1,
  options: { registry: 'https://registry.example/' },
  nodes,
  edges,
})

t.test(
  'keeps the production subgraph of the deployed workspace',
  t => {
    const { lockfile, workspaces } = deployLockfile(
      data(
        {
          'file~_d typescript': 'dev ^5 ~npm~typescript@5.7.3',
          'workspace~apps+app lib':
            'prod workspace:* workspace~libs+lib',
          'workspace~apps+app ms': 'prod catalog: ~npm~ms@2.1.3',
          'workspace~apps+app tap': 'dev ^21 ~npm~tap@21.0.0',
          'workspace~apps+app fsevents': 'optional ^2 MISSING',
          'workspace~libs+lib is-even':
            'optional ^1 ~npm~is-even@1.0.0',
          'workspace~libs+lib range': 'prod >=1 <2 ~npm~range@1.5.0',
          'workspace~libs+lib tool':
            'dev workspace:* workspace~libs+tool',
          '~npm~is-even@1.0.0 is-odd': 'prod ^0.1 ~npm~is-odd@0.1.2',
          '~npm~is-even@1.0.0 range': 'prod ^1 ~npm~range@1.5.0',
          '~npm~tap@21.0.0 ms': 'prod ^2 ~npm~ms@2.1.3',
        },
        {
          // brotli flag is kept, dev flag is dropped
          '~npm~ms@2.1.3': [6, 'ms', 'sha512-ms'],
          '~npm~is-even@1.0.0': [0, 'is-even'],
          '~npm~is-odd@0.1.2': [2, 'is-odd'],
          '~npm~range@1.5.0': [1, 'range'],
          '~npm~tap@21.0.0': [2, 'tap'],
          '~npm~typescript@5.7.3': [2, 'typescript'],
        },
      ),
      app,
    )

    t.strictSame(workspaces, [
      {
        id: lib,
        path: 'libs/lib',
        deployId: 'workspace~.vlt-deploy+libs+lib',
        deployPath: '.vlt-deploy/libs/lib',
        rootSpecs: {},
      },
    ])
    t.strictSame(lockfile, {
      lockfileVersion: 1,
      options: { registry: 'https://registry.example/' },
      nodes: {
        '~npm~ms@2.1.3': [4, 'ms', 'sha512-ms'],
        '~npm~is-even@1.0.0': [1, 'is-even'],
        '~npm~is-odd@0.1.2': [1, 'is-odd'],
        // reached through a required edge as well
        '~npm~range@1.5.0': [0, 'range'],
      },
      edges: {
        'file~_d fsevents': 'optional ^2 MISSING',
        'file~_d lib':
          'prod workspace:* workspace~.vlt-deploy+libs+lib',
        'file~_d ms': 'prod catalog: ~npm~ms@2.1.3',
        'workspace~.vlt-deploy+libs+lib is-even':
          'optional ^1 ~npm~is-even@1.0.0',
        'workspace~.vlt-deploy+libs+lib range':
          'prod >=1 <2 ~npm~range@1.5.0',
        '~npm~is-even@1.0.0 is-odd': 'prod ^0.1 ~npm~is-odd@0.1.2',
        '~npm~is-even@1.0.0 range': 'prod ^1 ~npm~range@1.5.0',
      },
    })
    t.end()
  },
)

t.test('deploys the project root', t => {
  const { lockfile, workspaces } = deployLockfile(
    data({
      'file~_d ms': 'prod ^2 ~npm~ms@2.1.3',
      'file~_d tap': 'dev ^21 ~npm~tap@21.0.0',
    }),
    'file~_d',
  )
  t.strictSame(workspaces, [])
  t.strictSame(lockfile.edges, {
    'file~_d ms': 'prod ^2 ~npm~ms@2.1.3',
  })
  t.end()
})

t.test('a workspace cycle links back to the root', t => {
  const { lockfile, workspaces } = deployLockfile(
    data({
      'workspace~apps+app tool':
        'prod workspace:* workspace~libs+tool',
      'workspace~apps+app lib': 'prod workspace:* workspace~libs+lib',
      'workspace~libs+tool app':
        'peer workspace:^ workspace~apps+app',
    }),
    app,
  )
  t.strictSame(
    workspaces.map(ws => [ws.id, ws.rootSpecs]),
    [
      [lib, {}],
      [tool, { app: 'file:../../..' }],
    ],
    'sorted by path, with the spec to use for the root',
  )
  t.equal(
    lockfile.edges['workspace~.vlt-deploy+libs+tool app'],
    'peer file:../../.. file~_d',
  )
  t.end()
})

t.test('file: dependencies are not supported', t => {
  t.throws(
    () =>
      deployLockfile(
        data({ 'workspace~apps+app x': 'prod file:../x file~x' }),
        app,
      ),
    { message: /does not support file: dependencies/ },
  )
  t.end()
})

t.test('only workspaces can depend on the deployed package', t => {
  t.throws(
    () =>
      deployLockfile(
        data({
          'workspace~apps+app y': 'prod ^1 ~npm~y@1.0.0',
          '~npm~y@1.0.0 app': 'prod * workspace~apps+app',
        }),
        app,
      ),
    { message: 'Unexpected dependency on the deployed package' },
  )
  t.end()
})
