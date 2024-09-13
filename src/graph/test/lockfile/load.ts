import { DepID, DepIDTuple, joinDepIDTuple } from '@vltpkg/dep-id'
import { SpecOptions } from '@vltpkg/spec'
import t from 'tap'
import { LockfileNode } from '../../dist/esm/index.js'
import { load, loadHidden } from '../../src/lockfile/load.js'
import {
  LockfileData,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileEdgeValue,
} from '../../src/lockfile/types.js'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.js'

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    npm: 'https://registry.npmjs.org',
    custom: 'http://example.com',
  },
} satisfies SpecOptions

const mainManifest = {
  name: 'my-project',
  version: '1.0.0',
}

const edgeKey = (from: DepIDTuple, to: string): LockfileEdgeKey =>
  `${joinDepIDTuple(from)} ${to}`

t.test('load', async t => {
  // split these out to verify TS will complain about them.
  // otherwise it stops at the first '': '' type error in the object.
  //@ts-expect-error
  const spaceKey: LockfileEdgeKey = ' '
  //@ts-expect-error
  const spaceVal: LockfileEdgeValue = ' '
  const edges: LockfileEdges = {
    [edgeKey(['file', '.'], 'linked')]:
      'prod file:./linked ' + joinDepIDTuple(['file', 'linked']),
    // a spec with spaces, verify it doesn't get confused
    [edgeKey(['file', '.'], 'foo')]:
      'prod ^1.0.0 || 1.2.3 ||  2.3.4 ' +
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    [edgeKey(['file', '.'], 'bar')]:
      'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'bar@1.0.0']),
    [edgeKey(['file', '.'], 'missing')]: 'prod ^1.0.0 MISSING',
    [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
      'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'baz@1.0.0']),
    //@ts-expect-error
    '': '',
    [spaceKey]: spaceVal,
  }
  const lockfileData: LockfileData = {
    registries: {
      npm: 'https://registry.npmjs.org',
      custom: 'https://registry.example.com',
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['file', 'linked'])]: [0, 'linked'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
      [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
        0,
        'bar',
        'sha512-6/deadbeef==',
        'https://registry.example.com/bar/-/bar-1.0.0.tgz',
      ],
      [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
        0,
        'baz',
        null,
        null,
        './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
      ],
    } as Record<DepID, LockfileNode>,
    edges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
  })

  const graph = load({
    ...configData,
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(humanReadableOutput(graph))
})

t.test('loadHidden', async t => {
  // split these out to verify TS will complain about them.
  // otherwise it stops at the first '': '' type error in the object.
  //@ts-expect-error
  const spaceKey: LockfileEdgeKey = ' '
  //@ts-expect-error
  const spaceVal: LockfileEdgeValue = ' '
  const edges: LockfileEdges = {
    [edgeKey(['file', '.'], 'linked')]:
      'prod file:./linked ' + joinDepIDTuple(['file', 'linked']),
    // a spec with spaces, verify it doesn't get confused
    [edgeKey(['file', '.'], 'foo')]:
      'prod ^1.0.0 || 1.2.3 ||  2.3.4 ' +
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    [edgeKey(['file', '.'], 'bar')]:
      'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'bar@1.0.0']),
    [edgeKey(['file', '.'], 'missing')]: 'prod ^1.0.0 MISSING',
    [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
      'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'baz@1.0.0']),
    //@ts-expect-error
    '': '',
    [spaceKey]: spaceVal,
  }
  const lockfileData: LockfileData = {
    registries: {
      npm: 'https://registry.npmjs.org',
      custom: 'https://registry.example.com',
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['file', 'linked'])]: [0, 'linked'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
      [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
        0,
        'bar',
        'sha512-6/deadbeef==',
        'https://registry.example.com/bar/-/bar-1.0.0.tgz',
      ],
      [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
        0,
        'baz',
        null,
        null,
        './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
      ],
    } as Record<DepID, LockfileNode>,
    edges,
  }
  const projectRoot = t.testdir({
    node_modules: {
      '.vlt-lock.json': JSON.stringify(lockfileData),
    },
  })

  const graph = loadHidden({
    ...configData,
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(humanReadableOutput(graph))
})

t.test('workspaces', async t => {
  const lockfileData: LockfileData = {
    registries: {
      npm: 'https://registry.npmjs.org',
      custom: 'http://example.com',
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'c@1.0.0'])]: [
        0,
        'c',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
      [joinDepIDTuple(['workspace', 'packages/a'])]: [0, 'a'],
      [joinDepIDTuple(['workspace', 'packages/b'])]: [0, 'b'],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['workspace', 'packages/b'], 'c')]:
        'prod ^1.0.0 ' + joinDepIDTuple(['registry', '', 'c@1.0.0']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
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

  const graph = load({
    ...configData,
    projectRoot,
    mainManifest,
  })
  t.matchSnapshot(humanReadableOutput(graph))
})

t.test('unknown dep type', async t => {
  const lockfileData: LockfileData = {
    registries: {
      npm: 'https://registry.npmjs.org',
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['file', '.'], 'foo')]:
        'unknown 1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
  })

  t.throws(
    () =>
      load({
        ...configData,
        projectRoot,
        mainManifest,
      }),
    /Found unsupported dependency type in lockfile/,
    'should throw a dependency type not found',
  )
})

t.test('invalid dep id in edge', async t => {
  const lockfileData: LockfileData = {
    registries: {
      npm: 'https://registry.npmjs.org',
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      //@ts-expect-error
      'null foo':
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    },
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
  })

  t.throws(
    () =>
      load({
        ...configData,
        projectRoot,
        mainManifest,
      }),
    /Expected dep id/,
    'should throw a missing from edge property',
  )
})

t.test('missing edge `from`', async t => {
  const lockfileData: LockfileData = {
    registries: {
      npm: 'https://registry.npmjs.org',
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['registry', '', 'bar@1.2.3'], 'foo')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
  })

  t.throws(
    () =>
      load({
        ...configData,
        projectRoot,
        mainManifest,
      }),
    /Edge info missing its `from` node/,
    'should throw a missing from edge property',
  )
})
