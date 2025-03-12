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
})
