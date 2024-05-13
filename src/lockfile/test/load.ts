import { resolve } from 'node:path'
import { humanReadableOutput, PackageInventory } from '@vltpkg/graph'
import { inspect } from 'util'
import t from 'tap'
import { load } from '../src/load.js'

t.test('load', async t => {
  const dir = t.testdir({
    'vltlock.json': JSON.stringify({
      hosts: {
        'npm:': 'https://registry.npmjs.org',
      },
      store: [
        'my-project@1.0.0; ',
        'foo@1.0.0; ',
        'bar@1.0.0; ',
        'baz@1.0.0; ',
      ],
      tree: [
        'my-project; ; ; 0; 5; 0',
        'foo; foo@^1.0.0; prod; 1; 0; 1',
        'bar; bar@^1.0.0; prod; 2; 3; 2',
        'baz; baz@^1.0.0; prod; 3; 2; 3',
        'foo; foo@^1.0.0; prod; 4; 1; 1',
        'missing; missing@^1.0.0; prod; 5; 4; ',
      ],
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
    'vltlock.json': JSON.stringify({
      hosts: {
        'npm:': 'https://registry.npmjs.org',
        'my-host:': 'https://example.com',
      },
      store: [
        'my-project@1.0.0; ',
        'my-host:@scope/foo@1.0.0; sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
      tree: [
        'my-project; ; ; 0; 1; 0',
        'foo; foo@my-host:@scope/foo@^1.0.0; prod; 1; 0; 1',
      ],
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
    'vltlock.json': JSON.stringify({
      hosts: {
        'npm:': 'https://registry.npmjs.org',
        'my-host:': 'https://example.com',
      },
      store: ['my-project@1.0.0; ', 'foo@1.0.0'],
      tree: [
        'my-project; ; ; 0; 1; 0',
        'foo; foo@^1.0.0; unknown; 1; 0; 1',
      ],
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
    'vltlock.json': JSON.stringify({
      hosts: {
        'npm:': 'https://registry.npmjs.org',
      },
      store: [],
      tree: [
        'my-project; ; ; 0; 1; 0',
        'foo; foo@^1.0.0; prod; 1; 0; 1',
      ],
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
