import { humanReadableOutput, PackageInventory } from '@vltpkg/graph'
import { inspect } from 'util'
import t from 'tap'
import { load } from '../src/load.js'

t.test('load', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        'npm:': 'https://registry.npmjs.org',
      },
      store: {
        'my-project@1.0.0': '',
        'foo@1.0.0':
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        'bar@1.0.0': '',
        'baz@1.0.0': '',
      },
      tree: [
        '; ; my-project@1.0.0',
        'foo@^1.0.0; prod; foo@1.0.0',
        'bar@^1.0.0; prod; bar@1.0.0',
        'baz@^1.0.0; prod; baz@1.0.0',
        'foo@^1.0.0; prod; foo@1.0.0',
        'missing@^1.0.0; prod; ',
      ],
      treeId: 'BQADAgEE',
    }),
  })

  const graph = load({
    dir,
    packageInventory: new PackageInventory(),
  })
  t.matchSnapshot(
    inspect(humanReadableOutput(graph), { depth: Infinity }),
  )
})

t.test('load dist using shasum', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        'npm:': 'https://registry.npmjs.org',
      },
      store: {
        'my-project@1.0.0': '',
        'foo@1.0.0': '; cf59829b8b4f03f89dda2771cb7f3653828c89bf',
      },
      tree: ['; ; my-project@1.0.0', 'foo@^1.0.0; prod; foo@1.0.0'],
      treeId: 'AQA=',
    }),
  })

  const graph = load({
    dir,
    packageInventory: new PackageInventory(),
  })
  t.matchSnapshot(
    inspect(humanReadableOutput(graph), { depth: Infinity }),
  )
})

t.test('custom origin', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        'npm:': 'https://registry.npmjs.org',
        'my-host:': 'https://example.com',
      },
      store: {
        'my-project@1.0.0': '',
        'my-host:@scope/foo@1.0.0':
          'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      },
      tree: [
        '; ; my-project@1.0.0',
        'foo@my-host:@scope/foo@^1.0.0; prod; my-host:@scope/foo@1.0.0',
      ],
      treeId: 'AQA=',
    }),
  })

  const graph = load({
    dir,
    packageInventory: new PackageInventory(),
  })
  t.matchSnapshot(
    inspect(humanReadableOutput(graph), { depth: Infinity }),
  )
})

t.test('unknown dep type', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        'npm:': 'https://registry.npmjs.org',
        'my-host:': 'https://example.com',
      },
      store: { 'my-project@1.0.0': '', 'foo@1.0.0': '' },
      tree: [
        '; ; my-project@1.0.0',
        'foo@^1.0.0; unknown; foo@1.0.0',
      ],
      treeId: 'AQA=',
    }),
  })

  t.throws(
    () =>
      load({
        dir,
        packageInventory: new PackageInventory(),
      }),
    /Dependency type not found/,
    'should throw a dependency type not found',
  )
})

t.test('missing root pkg', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        'npm:': 'https://registry.npmjs.org',
      },
      store: {},
      tree: ['; ; ', 'foo@^1.0.0; prod; '],
      treeId: 'AQA=',
    }),
  })

  t.throws(
    () =>
      load({
        dir,
        packageInventory: new PackageInventory(),
      }),
    /Missing root package metadata/,
    'should throw a missing root package metadata error',
  )
})

t.test('empty tree id', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        'npm:': 'https://registry.npmjs.org',
      },
      store: { 'my-project@1.0.0': '', 'foo@1.0.0': '' },
      tree: ['; ; ', 'foo@^1.0.0; prod; '],
      treeId: '',
    }),
  })

  t.throws(
    () =>
      load({
        dir,
        packageInventory: new PackageInventory(),
      }),
    /Could not read index from tree id/,
    'should throw a read tree id error',
  )
})

t.test('unexpected store value', async t => {
  const dir = t.testdir({
    'vlt-lock.json': JSON.stringify({
      registries: {
        'npm:': 'https://registry.npmjs.org',
      },
      store: { 'my-project@1.0.0': 0, 'foo@1.0.0': 1 },
      tree: ['; ; ', 'foo@^1.0.0; prod; '],
      treeId: 'AQA=',
    }),
  })

  t.throws(
    () =>
      load({
        dir,
        packageInventory: new PackageInventory(),
      }),
    /Unexpected value found at lockfile store/,
    'should throw a unexpected value error',
  )
})
