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
  get: () => undefined,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should call install with expected options')

// adds a new package
await Command.command({
  positionals: ['abbrev@2'],
  values: { 'save-dev': true },
  options,
  get: () => undefined,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should install adding a new dependency')

t.strictSame(
  Command.views.json({
    graph: {
      toJSON: () => ({
        lockfileVersion: 1,
        options: {},
        nodes: {},
        edges: {},
      }),
    } as any,
  }),
  {
    graph: { lockfileVersion: 1, options: {}, nodes: {}, edges: {} },
  },
  'json view without buildQueue should only include graph',
)

// Test JSON view with buildQueue
t.strictSame(
  Command.views.json({
    buildQueue: ['~~foo@1.0.0' as any, '~~bar@2.0.0' as any],
    graph: {
      toJSON: () => ({
        lockfileVersion: 1,
        options: {},
        nodes: {},
        edges: {},
      }),
    } as any,
  }),
  {
    buildQueue: ['~~foo@1.0.0', '~~bar@2.0.0'],
    message:
      '2 packages that will need to be built, run "vlt build" to complete the install.',
    graph: { lockfileVersion: 1, options: {}, nodes: {}, edges: {} },
  },
  'json view with buildQueue should include buildQueue, message, and graph',
)

// Test JSON view with empty buildQueue (should not include buildQueue or message)
t.strictSame(
  Command.views.json({
    buildQueue: [],
    graph: {
      toJSON: () => ({
        lockfileVersion: 1,
        options: {},
        nodes: {},
        edges: {},
      }),
    } as any,
  }),
  {
    graph: { lockfileVersion: 1, options: {}, nodes: {}, edges: {} },
  },
  'json view with empty buildQueue should only include graph',
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
    },
  })

  await Command.command({
    positionals: [],
    values: {},
    options,
    get: () => undefined,
  } as unknown as LoadedConfig)

  t.match(
    log,
    /install frozenLockfile=true/,
    'should pass frozenLockfile to install',
  )
})

t.test('global install flag', async t => {
  let applyGlobalCalled = false
  let linkGlobalBinsCalled = false
  let checkPathHintCalled = false
  let stderrMessages: string[] = []
  let installLog = ''

  const Command = await t.mockImport<
    typeof import('../../src/commands/install.ts')
  >('../../src/commands/install.ts', {
    '@vltpkg/graph': {
      async install() {
        installLog += 'install\n'
        return {
          graph: {
            toJSON: () => ({}),
            importers: new Set(),
          },
        }
      },
    },
    '../../src/parse-add-remove-args.ts': {
      parseAddArgs: () => ({ add: new Map() }),
    },
    '../../src/global.ts': {
      applyGlobalConfig: () => {
        applyGlobalCalled = true
        return '/fake/global/dir'
      },
      linkGlobalBins: async () => {
        linkGlobalBinsCalled = true
        return ['cowsay']
      },
      checkPathHint: () => {
        checkPathHintCalled = true
      },
    },
    '../../src/output.ts': {
      stderr: (...args: unknown[]) => {
        stderrMessages.push(String(args[0]))
      },
    },
  })

  await Command.command({
    positionals: ['cowsay'],
    values: {},
    options: {},
    get: (key: string) => (key === 'global' ? true : undefined),
  } as unknown as LoadedConfig)

  t.ok(
    applyGlobalCalled,
    'should call applyGlobalConfig when --global is set',
  )
  t.ok(
    linkGlobalBinsCalled,
    'should call linkGlobalBins after install',
  )
  t.ok(checkPathHintCalled, 'should call checkPathHint after install')
  t.ok(
    stderrMessages.some(m => m.includes('cowsay')),
    'should report linked binary names',
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
    },
  })

  await Command.command({
    positionals: [],
    values: {},
    options,
    get: () => undefined,
  } as unknown as LoadedConfig)

  t.match(
    log,
    /install lockfileOnly=true/,
    'should pass lockfileOnly to install',
  )
})
