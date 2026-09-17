import { error } from '@vltpkg/error-cause'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const options = {}
let log = ''
t.afterEach(() => (log = ''))

const Command = await t.mockImport<
  typeof import('../../src/commands/install.ts')
>('../../src/commands/install.ts', {
  '@vltpkg/graph': {
    async install() {
      log += 'install\n'
      return {
        graph: {
          toJSON: () => ({}),
        },
      }
    },
  },
  '../../src/parse-add-remove-args.ts': {
    parseAddArgs: (conf: LoadedConfig) => {
      const items =
        conf.positionals.length > 0 ?
          `from ${conf.positionals.join(',')}`
        : ''
      const values =
        Object.keys(conf.values).length > 0 ?
          `, with values ${Object.entries(conf.values).join('=')}`
        : ''
      log += `parse add args ${items}${values}\n`
      return { add: new Map() }
    },
  },
})

t.matchSnapshot(Command.usage().usage(), 'usage')

await Command.command({
  positionals: [],
  values: {},
  options,
  explicit: {},
  get: () => undefined,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should call install with expected options')

// adds a new package
await Command.command({
  positionals: ['abbrev@2'],
  values: { 'save-dev': true },
  options,
  explicit: {},
  get: () => undefined,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should install adding a new dependency')

// Helper to create mock nodes
const mockNode = (
  name: string,
  version: string,
  importer = false,
) => ({
  id: `~~${name}@${version}`,
  name,
  version,
  importer,
})

// Helper to create a mock "from" (actual) graph with a set of node IDs
const mockFrom = (...ids: string[]) => ({
  nodes: new Map(ids.map(id => [id, true])),
})

// Test JSON view with no diff (e.g. lockfile-only mode)
t.strictSame(
  Command.views.json({
    graph: {} as any,
  }),
  {
    add: [],
    added: 0,
    change: [],
    changed: 0,
    remove: [],
    removed: 0,
  },
  'json view without diff should return empty diff result',
)

// Test JSON view with added packages
t.strictSame(
  Command.views.json({
    graph: {} as any,
    diff: {
      nodes: {
        add: new Set([mockNode('simple-output', '3.0.0')]),
        delete: new Set(),
      },
    } as any,
  }),
  {
    add: [{ name: 'simple-output', version: '3.0.0' }],
    added: 1,
    change: [],
    changed: 0,
    remove: [],
    removed: 0,
  },
  'json view should show added packages',
)

// Test JSON view with removed packages (node was on disk = real removal)
t.strictSame(
  Command.views.json({
    graph: {} as any,
    diff: {
      from: mockFrom('~~old-dep@1.0.0'),
      nodes: {
        add: new Set(),
        delete: new Set([mockNode('old-dep', '1.0.0')]),
      },
    } as any,
  }),
  {
    add: [],
    added: 0,
    change: [],
    changed: 0,
    remove: [{ name: 'old-dep', version: '1.0.0' }],
    removed: 1,
  },
  'json view should show removed packages',
)

// Test JSON view with changed packages (same name in both add and delete)
t.strictSame(
  Command.views.json({
    graph: {} as any,
    diff: {
      from: mockFrom('~~my-dep@1.0.0'),
      nodes: {
        add: new Set([mockNode('my-dep', '2.0.0')]),
        delete: new Set([mockNode('my-dep', '1.0.0')]),
      },
    } as any,
  }),
  {
    add: [],
    added: 0,
    change: [{ name: 'my-dep', from: '1.0.0', to: '2.0.0' }],
    changed: 1,
    remove: [],
    removed: 0,
  },
  'json view should show changed packages',
)

// Test JSON view with a mix of add, change, and remove
t.strictSame(
  Command.views.json({
    graph: {} as any,
    diff: {
      from: mockFrom('~~removed-dep@1.0.0', '~~updated-dep@2.0.0'),
      nodes: {
        add: new Set([
          mockNode('new-dep', '1.0.0'),
          mockNode('updated-dep', '3.0.0'),
        ]),
        delete: new Set([
          mockNode('removed-dep', '1.0.0'),
          mockNode('updated-dep', '2.0.0'),
        ]),
      },
    } as any,
  }),
  {
    add: [{ name: 'new-dep', version: '1.0.0' }],
    added: 1,
    change: [{ name: 'updated-dep', from: '2.0.0', to: '3.0.0' }],
    changed: 1,
    remove: [{ name: 'removed-dep', version: '1.0.0' }],
    removed: 1,
  },
  'json view should categorize add, change, and remove correctly',
)

// Test JSON view filters out importers
t.strictSame(
  Command.views.json({
    graph: {} as any,
    diff: {
      nodes: {
        add: new Set([
          mockNode('my-project', '1.0.0', true),
          mockNode('real-dep', '2.0.0'),
        ]),
        delete: new Set([mockNode('my-project', '0.9.0', true)]),
      },
    } as any,
  }),
  {
    add: [{ name: 'real-dep', version: '2.0.0' }],
    added: 1,
    change: [],
    changed: 0,
    remove: [],
    removed: 0,
  },
  'json view should filter out importer nodes',
)

// Test JSON view: already-missing optional deps should NOT be reported as removed.
// These are platform-specific binaries (e.g. lightningcss-android-arm64) that
// were never installed because they don't match the current OS/arch. The diff's
// optionalFail moves them to the delete set, but they were never on disk (not
// in the "from" actual graph) so they should be filtered out.
t.strictSame(
  Command.views.json({
    graph: {} as any,
    diff: {
      from: mockFrom(), // empty actual graph — nothing was on disk
      nodes: {
        add: new Set(),
        delete: new Set([
          mockNode('lightningcss-android-arm64', '1.29.3'),
          mockNode('@rolldown/binding-win32-x64-msvc', '1.0.0'),
        ]),
      },
    } as any,
  }),
  {
    add: [],
    added: 0,
    change: [],
    changed: 0,
    remove: [],
    removed: 0,
  },
  'json view should NOT report already-missing optional deps as removed',
)

// Test JSON view: optional dep that WAS installed and is actually being
// removed should still appear in the remove list.
t.strictSame(
  Command.views.json({
    graph: {} as any,
    diff: {
      // The dep existed in the actual graph (was on disk)
      from: mockFrom('~~lightningcss-linux-x64-gnu@1.29.3'),
      nodes: {
        add: new Set(),
        delete: new Set([
          mockNode('lightningcss-linux-x64-gnu', '1.29.3'),
        ]),
      },
    } as any,
  }),
  {
    add: [],
    added: 0,
    change: [],
    changed: 0,
    remove: [
      { name: 'lightningcss-linux-x64-gnu', version: '1.29.3' },
    ],
    removed: 1,
  },
  'json view should report actually-installed optional dep as removed when deleted',
)

// Test JSON view with buildQueue
t.strictSame(
  Command.views.json({
    buildQueue: ['~~foo@1.0.0' as any, '~~bar@2.0.0' as any],
    graph: {} as any,
    diff: {
      nodes: {
        add: new Set([
          mockNode('foo', '1.0.0'),
          mockNode('bar', '2.0.0'),
        ]),
        delete: new Set(),
      },
    } as any,
  }),
  {
    add: [
      { name: 'foo', version: '1.0.0' },
      { name: 'bar', version: '2.0.0' },
    ],
    added: 2,
    change: [],
    changed: 0,
    remove: [],
    removed: 0,
    buildQueue: ['~~foo@1.0.0', '~~bar@2.0.0'],
    message:
      '2 packages that will need to be built, run "vlt build" to complete the install.',
  },
  'json view with buildQueue should include buildQueue and message',
)

// Test JSON view with empty buildQueue (should not include buildQueue or message)
t.strictSame(
  Command.views.json({
    buildQueue: [],
    graph: {} as any,
  }),
  {
    add: [],
    added: 0,
    change: [],
    changed: 0,
    remove: [],
    removed: 0,
  },
  'json view with empty buildQueue should not include buildQueue or message',
)

t.test('frozen-lockfile flag', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.0.0',
    }),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: 1,
      options: {},
      nodes: {},
      edges: {},
    }),
  })

  const options = {
    projectRoot: dir,
    scurry: { relativePosix: () => '' },
    'frozen-lockfile': true,
  }

  let log = ''
  const Command = await t.mockImport<
    typeof import('../../src/commands/install.ts')
  >('../../src/commands/install.ts', {
    '@vltpkg/graph': {
      async install(opts: any, add: any) {
        log += `install frozenLockfile=${opts.frozenLockfile}\n`
        if (add && add.size > 0) {
          log += `add packages: ${add.size}\n`
        }
        return {
          graph: {
            toJSON: () => ({}),
          },
        }
      },
      asDependency: (dep: any) => dep,
      addKey: (spec: any) =>
        spec.name === '(unknown)' ? spec.spec : spec.name,
    },
  })

  await Command.command({
    positionals: [],
    values: {},
    options,
    explicit: {},
    get: () => undefined,
  } as unknown as LoadedConfig)

  t.match(
    log,
    /install frozenLockfile=true/,
    'should pass frozenLockfile to install',
  )
})

t.test('lockfile-only flag', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.0.0',
    }),
  })

  const options = {
    projectRoot: dir,
    scurry: { relativePosix: () => '' },
    'lockfile-only': true,
  }

  let log = ''
  const Command = await t.mockImport<
    typeof import('../../src/commands/install.ts')
  >('../../src/commands/install.ts', {
    '@vltpkg/graph': {
      async install(opts: any, add: any) {
        log += `install lockfileOnly=${opts.lockfileOnly}\n`
        if (add && add.size > 0) {
          log += `add packages: ${add.size}\n`
        }
        return {
          graph: {},
        }
      },
      asDependency: (dep: any) => dep,
      addKey: (spec: any) =>
        spec.name === '(unknown)' ? spec.spec : spec.name,
    },
  })

  await Command.command({
    positionals: [],
    values: {},
    options,
    explicit: {},
    get: () => undefined,
  } as unknown as LoadedConfig)

  t.match(
    log,
    /install lockfileOnly=true/,
    'should pass lockfileOnly to install',
  )
})

t.test('persists spec config after install', async t => {
  const plan = {
    which: 'project',
    values: { registries: { loc: 'http://loc/' } },
  }
  const setup = async (opts: {
    plan?: typeof plan
    conflict?: boolean
    fail?: boolean | Error
  }) => {
    let log = ''
    const Command = await t.mockImport<
      typeof import('../../src/commands/install.ts')
    >('../../src/commands/install.ts', {
      '@vltpkg/graph': {
        async install() {
          log += 'install\n'
          if (opts.fail instanceof Error) throw opts.fail
          if (opts.fail) throw new Error('install failed')
          return { graph: {} }
        },
      },
      '../../src/parse-add-remove-args.ts': {
        parseAddArgs: () => ({ add: new Map() }),
      },
      '../../src/persist-spec-config.ts': {
        planSpecConfigPersist: () => {
          log += 'plan\n'
          if (opts.conflict) throw new Error('conflict')
          return opts.plan
        },
      },
    })
    const conf = {
      positionals: [],
      values: {},
      options: {},
      get: () => undefined,
      addConfigToFile: async (which: string, values: unknown) => {
        log += `write ${which} ${JSON.stringify(values)}\n`
      },
    } as unknown as LoadedConfig
    return { run: () => Command.command(conf), log: () => log }
  }

  t.test('writes after install', async t => {
    const { run, log } = await setup({ plan })
    const res = await run()
    t.equal(
      log(),
      'plan\ninstall\nwrite project {"registries":{"loc":"http://loc/"}}\n',
    )
    t.strictSame(res.persistedConfig, plan)
  })
  t.test('no plan, no write', async t => {
    const { run, log } = await setup({})
    const res = await run()
    t.equal(log(), 'plan\ninstall\n')
    t.equal(res.persistedConfig, undefined)
  })
  t.test('failed install, no write', async t => {
    const { run, log } = await setup({ plan, fail: true })
    await t.rejects(run(), { message: 'install failed' })
    t.equal(log(), 'plan\ninstall\n')
  })
  t.test('unknown spec prefix from package.json', async t => {
    const { run } = await setup({
      fail: error('Protocol nope: is not defined', {
        spec: 'bar@nope:bar@^2.x',
        found: 'nope:',
      }),
    })
    await t.rejects(run(), {
      message:
        /^Unknown spec prefix "nope:" in "bar@nope:bar@\^2\.x"/,
      cause: { code: 'ECONFIG' },
    })
  })
  t.test('conflict, no install', async t => {
    const { run, log } = await setup({ plan, conflict: true })
    await t.rejects(run(), { message: 'conflict' })
    t.equal(log(), 'plan\n')
  })
  t.end()
})

t.test('json view includes persistedConfig', async t => {
  const persistedConfig = {
    which: 'project' as const,
    values: { registries: { loc: 'http://loc/' } },
  }
  t.match(Command.views.json({ graph: {} as any, persistedConfig }), {
    persistedConfig,
  })
})
