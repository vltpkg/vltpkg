import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import type { ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type {
  VltServerListening,
  VltServerOptions,
} from '../src/index.ts'

const MOCKS = {
  '../src/handle-request.ts': {
    handleRequest: (_: unknown, res: ServerResponse, __: unknown) =>
      res.end('ok'),
  },
  '../src/graph-data.ts': {
    updateGraphData: () => {},
  },
  '../src/dashboard.ts': {
    Dashboard: class {
      update() {}
    },
  },
}

const { createServer, VltServer } = await t.mockImport<
  typeof import('../src/index.ts')
>('../src/index.ts', MOCKS)

t.type(
  createServer({} as unknown as VltServerOptions),
  VltServer,
  'createServer makes a server',
)

t.test('start listening', async t => {
  const dir = t.testdir({
    projects: {
      x: {
        'package.json': JSON.stringify({ name: 'x' }),
      },
    },
    s1: {
      assets: {},
      public: {},
    },
    s2: {
      assets: {},
      public: {},
    },
  })

  const opts = {
    'dashboard-root': [resolve(dir, 'projects')],
    packageJson: new PackageJson(),
    projectRoot: resolve(dir, 'projects/x'),
    scurry: new PathScurry(dir),
    packageInfo: new PackageInfoClient(),
  }

  const s1 = createServer({
    ...opts,
    publicDir: resolve(t.testdirName, 's1/public'),
  })
  const opts2 = { ...opts }

  t.throws(() => s1.address())

  s1.updateOptions(opts2)
  t.equal(s1.options, opts2, 'updated options')

  const s2 = new VltServer({
    ...opts,
    publicDir: resolve(t.testdirName, 's2/public'),
  })

  await s1.start()
  t.equal(s1.listening(), true)
  if (!s1.listening()) {
    throw new Error('not listening??')
  }

  const res = await fetch(s1.address('/hello'))
  t.equal(await res.text(), 'ok')

  await t.rejects(s1.start(), { message: 'server already listening' })
  await s2.start()
  t.not(s1.address(), s2.address())
  t.equal(s1.address('/hello/world').endsWith('/hello/world'), true)
  await s1.close()
  t.equal(s1.listening(), false)
  await s2.close()
  t.equal(s2.listening(), false)
  await t.rejects(s1.close())
  // simulate failure to close
  s1.listening = function (): this is VltServerListening {
    return true
  }
  await t.rejects(s1.close())

  t.test('simulate failure to listen', async t => {
    const { createServer } = await t.mockImport<
      typeof import('../src/index.ts')
    >('../src/index.ts', {
      ...MOCKS,
      '../src/listen-carefully.ts': {
        // i'm listening, I promise lol
        listenCarefully: async (_: unknown, p: number) => p,
      },
    })
    const s = createServer({
      ...opts,
      publicDir: resolve(t.testdirName, 's2/public'),
    })
    await t.rejects(s.start({ port: 12345 }), {
      message: 'failed to start server',
    })
  })

  t.test(
    'update() respects config dashboard-root fallbacks',
    async t => {
      const { VltServer } = await t.mockImport<
        typeof import('../src/index.ts')
      >('../src/index.ts', {
        ...MOCKS,
        '../src/config-data.ts': {
          ConfigManager: class {
            async get(
              key?: string,
              which?: 'user' | 'project',
            ): Promise<unknown> {
              if (key === 'dashboard-root' && which === 'project') {
                return ['from-project']
              }
              if (key === 'dashboard-root' && which === 'user') {
                return ['from-user']
              }
              return undefined
            }
          },
        },
      })

      const s = new VltServer({
        ...opts,
        'dashboard-root': [],
        publicDir: resolve(t.testdirName, 's3/public'),
      })

      await s.start()
      // project root should win
      t.same(s.dashboardRoot, ['from-project'])
      await s.close()
    },
  )

  t.test(
    'update() falls back to user dashboard-root when project empty',
    async t => {
      const { VltServer } = await t.mockImport<
        typeof import('../src/index.ts')
      >('../src/index.ts', {
        ...MOCKS,
        '../src/config-data.ts': {
          ConfigManager: class {
            async get(
              key?: string,
              which?: 'user' | 'project',
            ): Promise<unknown> {
              if (key === 'dashboard-root' && which === 'project') {
                return []
              }
              if (key === 'dashboard-root' && which === 'user') {
                return ['from-user']
              }
              return undefined
            }
          },
        },
      })

      const s = new VltServer({
        ...opts,
        'dashboard-root': [],
        publicDir: resolve(t.testdirName, 's4/public'),
      })

      await s.start()
      // user root should win if project is empty
      t.same(s.dashboardRoot, ['from-user'])
      await s.close()
    },
  )
})

t.test(
  'updateOptions refreshes ConfigManager when loadedConfig provided',
  async t => {
    let constructedWith: unknown = undefined
    const { createServer } = await t.mockImport<
      typeof import('../src/index.ts')
    >('../src/index.ts', {
      ...MOCKS,
      '../src/config-data.ts': {
        ConfigManager: class {
          constructor({ config }: { config: unknown }) {
            constructedWith = config
          }
          list() {}
        },
      },
    })

    const dir = t.testdir({
      projects: {
        x: {
          'package.json': JSON.stringify({ name: 'x' }),
        },
      },
      s: { assets: {}, public: {} },
    })

    const opts = {
      'dashboard-root': [resolve(dir, 'projects')],
      packageJson: new PackageJson(),
      projectRoot: resolve(dir, 'projects/x'),
      scurry: new PathScurry(dir),
      packageInfo: new PackageInfoClient(),
      publicDir: resolve(dir, 's/public'),
    }

    const s = createServer(opts as unknown as VltServerOptions)
    const fakeLoadedConfig = { projectRoot: dir } as unknown
    s.updateOptions({
      ...(opts as unknown as VltServerOptions),
      loadedConfig: fakeLoadedConfig as any,
    })

    t.equal(
      constructedWith,
      fakeLoadedConfig,
      'ConfigManager constructed with provided loadedConfig',
    )
  },
)
