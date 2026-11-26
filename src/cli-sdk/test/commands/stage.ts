import { PackageJson } from '@vltpkg/package-json'
import * as RC from '@vltpkg/registry-client'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import t from 'tap'
import type { Test } from 'tap'
import { Header } from 'tar'
import * as Publish from '../../src/commands/publish.ts'
import type { CommandResultSingle } from '../../src/commands/publish.ts'
import type { StageItem } from '../../src/commands/stage.ts'
import type { LoadedConfig } from '../../src/config/index.ts'

const result: CommandResultSingle = {
  id: 'a@1.0.0',
  name: 'a',
  version: '1.0.0',
  tag: 'latest',
  registry: 'https://registry.example.com',
  size: 1,
  unpackedSize: 1,
  files: [],
  staged: true,
}
const calls: unknown[][] = []

type Sent = {
  url: string
  method?: string
  useCache?: boolean
  headers?: Record<string, string>
  otp?: string
}
type Reply = {
  statusCode: number
  json?: () => unknown
  buffer?: () => Buffer
  text?: () => string
}
const sent: Sent[] = []
let reply: (url: string) => Reply

const Stage = await t.mockImport<
  typeof import('../../src/commands/stage.ts')
>('../../src/commands/stage.ts', {
  '../../src/commands/publish.ts': {
    ...Publish,
    publish: async (...args: unknown[]) => {
      calls.push(args)
      return result
    },
  },
  '@vltpkg/registry-client': {
    ...RC,
    RegistryClient: class {
      async request(
        url: URL,
        { method, useCache, headers, otp }: Omit<Sent, 'url'>,
      ) {
        sent.push({
          url: String(url),
          method,
          useCache,
          headers,
          otp,
        })
        return reply(String(url))
      }
    },
  },
})

const REG = 'https://r.example/acme/main/'
const ID = '3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b'
const headers = { 'npm-auth-type': 'web', 'npm-command': 'stage' }
const noPackageJson = { find: () => undefined }

const mkConf = (
  positionals: string[],
  options: Record<string, unknown> = {},
) =>
  ({
    positionals,
    options: {
      registry: REG,
      registries: {},
      packageJson: noPackageJson,
      ...options,
    },
  }) as unknown as LoadedConfig

const item: StageItem = {
  id: ID,
  packageName: '@acme/pkg',
  version: '1.0.0',
  tag: 'latest',
  createdAt: '2026-11-24T00:00:00.000Z',
  actor: 'alice',
  actorType: 'user',
  access: null,
  shasum: 'abc',
  status: 'staged',
}

const json = (body: unknown) => () => ({
  statusCode: 200,
  json: () => body,
})

t.beforeEach(() => {
  calls.length = 0
  sent.length = 0
  reply = json({})
})

t.test('usage', async t => {
  t.matchSnapshot(Stage.usage().usage())
})

t.test('views', async t => {
  const { human, json } = Stage.views
  t.equal(human(result), Publish.views.human(result))
  t.equal(human([result]), Publish.views.human([result]))
  t.equal(human([]), 'No staged packages found.')
  const lines = [
    'package name: @acme/pkg',
    'version: 1.0.0',
    'status: staged',
    'tag: latest',
    'date staged: 2026-11-24T00:00:00.000Z',
    'staged by: alice (user)',
    'shasum: abc',
  ]
  t.equal(
    human(item),
    [`📥 id: ${ID}`, ...lines].join('\n'),
    'npm order, null dropped',
  )
  const other: StageItem = {
    id: ID,
    packageName: 'b',
    version: '2.0.0',
    actor: 'ci',
    access: 'public',
  }
  t.equal(
    human([item, other]),
    [
      `├─ 📥 id: ${ID}`,
      ...lines.map(l => `│    ${l}`),
      '│',
      `└─ 📥 id: ${ID}`,
      '     package name: b',
      '     version: 2.0.0',
      '     staged by: ci',
      '     access: public',
    ].join('\n'),
    'a tree like vlt ls',
  )
  t.equal(
    human([other]),
    `└─ 📥 id: ${ID}\n     package name: b\n     version: 2.0.0\n     staged by: ci\n     access: public`,
    'one staged version',
  )
  t.equal(
    human({ id: ID, action: 'approved' }),
    `Staged package ${ID} approved and published successfully.`,
  )
  t.equal(
    human({ id: ID, action: 'rejected' }),
    `Staged package ${ID} has been rejected.`,
  )
  t.equal(human({ id: ID, file: 'a.tgz' }), 'a.tgz')
  t.equal(json(item), item)
})

t.test('human views use the vlt ls colors', async t => {
  const { human } = Stage.views
  const colors = { colors: true }
  const id = `\x1b[1mid:\x1b[22m \x1b[33m${ID}\x1b[39m`
  const key = (k: string) => `\x1b[1m${k}:\x1b[22m`
  t.equal(
    human(item, colors).split('\n').slice(0, 2).join('\n'),
    `\x1b[0m📥 ${id}\n${key('package name')} @acme/pkg`,
    'bold keys, highlighted id, reset like vlt ls',
  )
  const tree = human([item, item], colors).split('\n')
  t.equal(tree[0], `\x1b[0m├─ 📥 ${id}`)
  t.equal(tree[1], `│    ${key('package name')} @acme/pkg`)
  t.equal(tree[9], `└─ 📥 ${id}`)
  t.equal(tree.at(-1), `     ${key('shasum')} abc\x1b[0m`)
  t.equal(
    human({ id: ID, action: 'approved' }, colors),
    `\x1b[0mStaged package \x1b[33m${ID}\x1b[39m approved and published successfully.\x1b[0m`,
  )
  t.equal(
    human({ id: ID, action: 'rejected' }, colors),
    `\x1b[0mStaged package \x1b[33m${ID}\x1b[39m has been rejected.\x1b[0m`,
  )
  t.notMatch(human([item, item]), '\x1b', 'no colors')
})

t.test('publish stages with the publish command', async t => {
  const conf = mkConf(['publish'])
  t.equal(await Stage.command(conf), result)
  t.strictSame(calls, [[conf, { stage: true }]])
  t.strictSame(sent, [])
})

t.test('a subcommand is required', async t => {
  const validOptions = [
    'publish',
    'list',
    'ls',
    'view',
    'approve',
    'reject',
    'download',
  ]
  await t.rejects(Stage.command(mkConf([])), {
    message: 'stage command requires a subcommand',
    cause: { code: 'EUSAGE', validOptions },
  })
  await t.rejects(Stage.command(mkConf(['frobnicate'])), {
    message: 'Invalid stage subcommand',
    cause: { code: 'EUSAGE', found: 'frobnicate', validOptions },
  })
  t.strictSame(calls, [])
  t.strictSame(sent, [])
})

t.test('list', async t => {
  t.test('all staged versions', async t => {
    reply = json({ items: [item], total: 1 })
    t.strictSame(await Stage.command(mkConf(['list'])), [item])
    t.strictSame(sent, [
      {
        url: `${REG}-/stage?page=0&perPage=100`,
        method: 'GET',
        useCache: false,
        headers,
        otp: undefined,
      },
    ])
  })

  t.test('ls is an alias, a name filters', async t => {
    reply = json({ items: [], total: 0 })
    t.strictSame(await Stage.command(mkConf(['ls', 'foo'])), [])
    t.strictSame(await Stage.command(mkConf(['ls', 'foo@*'])), [])
    t.strictSame(
      await Stage.command(mkConf(['list', '@acme/pkg'])),
      [],
    )
    t.strictSame(
      sent.map(s => s.url),
      [
        `${REG}-/stage?page=0&perPage=100&package=foo`,
        `${REG}-/stage?page=0&perPage=100&package=foo`,
        `${REG}-/stage?page=0&perPage=100&package=%40acme%2Fpkg`,
      ],
    )
  })

  t.test('reads every page', async t => {
    const page = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        ...item,
        version: `${i}`,
      }))
    reply = url =>
      json({
        items: url.includes('page=0') ? page(100) : page(1),
        total: 101,
      })()
    const items = await Stage.command(mkConf(['list']))
    t.equal((items as StageItem[]).length, 101)
    t.strictSame(
      sent.map(s => s.url),
      [
        `${REG}-/stage?page=0&perPage=100`,
        `${REG}-/stage?page=1&perPage=100`,
      ],
    )
  })

  t.test('a short page is the last one', async t => {
    reply = json({ items: [item], total: 500 })
    t.strictSame(await Stage.command(mkConf(['list'])), [item])
    t.equal(sent.length, 1)
  })

  t.test('a version is refused', async t => {
    const conf = mkConf(['list', 'foo@1'], { registry: undefined })
    await t.rejects(Stage.command(conf), {
      message:
        'Version specifiers are not supported for listing staged packages',
      cause: { code: 'EUSAGE', found: 'foo@1' },
    })
    t.strictSame(sent, [])
  })
})

t.test('view', async t => {
  reply = json(item)
  t.equal(await Stage.command(mkConf(['view', ID])), item)
  t.strictSame(sent, [
    {
      url: `${REG}-/stage/${ID}`,
      method: 'GET',
      useCache: false,
      headers,
      otp: undefined,
    },
  ])
})

t.test('approve and reject send the otp', async t => {
  t.strictSame(
    await Stage.command(mkConf(['approve', ID], { otp: '123456' })),
    { id: ID, action: 'approved' },
  )
  t.strictSame(
    await Stage.command(mkConf(['reject', ID], { otp: '654321' })),
    { id: ID, action: 'rejected' },
  )
  t.strictSame(sent, [
    {
      url: `${REG}-/stage/${ID}/approve`,
      method: 'POST',
      useCache: false,
      headers,
      otp: '123456',
    },
    {
      url: `${REG}-/stage/${ID}`,
      method: 'DELETE',
      useCache: false,
      headers,
      otp: '654321',
    },
  ])
})

// a gzipped tarball holding `files` under package/
const tgz = (files: Record<string, string>) => {
  const chunks: Buffer[] = []
  for (const [path, body] of Object.entries(files)) {
    const h = Buffer.alloc(512)
    new Header({
      path: `package/${path}`,
      type: 'File',
      size: body.length,
      mode: 0o644,
    }).encode(h, 0)
    const b = Buffer.alloc(512 * Math.ceil(body.length / 512))
    b.write(body)
    chunks.push(h, b)
  }
  return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]))
}

t.test('download', async t => {
  const download = (t: Test, data: Buffer) => {
    const dir = t.testdir({})
    t.chdir(dir)
    reply = () => ({ statusCode: 200, buffer: () => data })
    return dir
  }

  t.test('named from the tarball package.json', async t => {
    const data = tgz({
      'package.json': JSON.stringify({
        name: '@scope/pkg',
        version: '1.2.3',
      }),
      'index.js': '',
    })
    const dir = download(t, data)
    const file = `scope-pkg-1.2.3-${ID}.tgz`
    t.strictSame(await Stage.command(mkConf(['download', ID])), {
      id: ID,
      file,
    })
    t.strictSame(readFileSync(resolve(dir, file)), data)
    t.strictSame(sent, [
      {
        url: `${REG}-/stage/${ID}/tarball`,
        method: 'GET',
        useCache: false,
        headers,
        otp: undefined,
      },
    ])
  })

  t.test('no package.json', async t => {
    const dir = download(t, tgz({ 'index.js': '' }))
    await t.rejects(Stage.command(mkConf(['download', ID])), {
      message: 'no package.json in tarball',
    })
    t.strictSame(readdirSync(dir), [])
  })

  for (const manifest of [
    { name: 'a' },
    { name: 'a', version: '1.0.0/../../x' },
  ]) {
    t.test(`unusable name: ${JSON.stringify(manifest)}`, async t => {
      const dir = download(
        t,
        tgz({ 'package.json': JSON.stringify(manifest) }),
      )
      await t.rejects(Stage.command(mkConf(['download', ID])), {
        message:
          'Could not read a package name and version from the staged tarball',
        cause: { found: manifest },
      })
      t.strictSame(readdirSync(dir), [])
    })
  }
})

// no registry configured: arguments are checked before it is resolved
t.test('stage ids', async t => {
  const noRegistry = { registry: undefined }
  for (const sub of ['view', 'approve', 'reject', 'download']) {
    await t.rejects(Stage.command(mkConf([sub], noRegistry)), {
      message: `stage ${sub} requires a <stage-id>`,
      cause: { code: 'EUSAGE' },
    })
    await t.rejects(
      Stage.command(mkConf([sub, 'nope'], noRegistry)),
      {
        message: 'stage-id must be a valid UUID',
        cause: { code: 'EUSAGE', found: 'nope' },
      },
    )
  }
  t.strictSame(sent, [])
})

t.test('registry errors', async t => {
  reply = () => ({ statusCode: 404, text: () => 'Not found' })
  await t.rejects(Stage.command(mkConf(['list'])), {
    message: /^Failed to list staged packages: 404/,
    cause: { code: 'EREQUEST', status: 404 },
  })
  await t.rejects(Stage.command(mkConf(['download', ID])), {
    message: /^Failed to download staged package: 404/,
    cause: { code: 'EREQUEST' },
  })
  reply = () => ({ statusCode: 401, text: () => '' })
  await t.rejects(Stage.command(mkConf(['approve', ID])), {
    message: /^Failed to approve staged package: 401/,
    cause: { code: 'ENEEDAUTH', method: 'POST' },
  })
  reply = () => {
    throw new Error('socket hang up')
  }
  await t.rejects(Stage.command(mkConf(['reject', ID])), {
    message: 'Failed to reject staged package: socket hang up',
    cause: { method: 'DELETE' },
  })
  await t.rejects(Stage.command(mkConf(['view', ID])), {
    message: 'Failed to view staged package: socket hang up',
  })
})

t.test('registry selection', async t => {
  const local = (t: Test, manifest: Record<string, unknown>) => {
    t.chdir(
      t.testdir({
        'package.json': JSON.stringify({
          name: 'pkg',
          version: '1.0.0',
          ...manifest,
        }),
      }),
    )
    return new PackageJson()
  }
  const publishConfig = { registry: 'https://p.example/acme/pub' }
  const viewUrl = (conf: LoadedConfig) =>
    Stage.command(conf).then(() => sent.at(-1)?.url)

  t.test('publishConfig.registry, nothing configured', async t => {
    const packageJson = local(t, { publishConfig })
    t.equal(
      await viewUrl(
        mkConf(['view', ID], { packageJson, registry: undefined }),
      ),
      `https://p.example/acme/pub/-/stage/${ID}`,
    )
  })

  t.test('publishConfig.registry wins, as for publish', async t => {
    const packageJson = local(t, { publishConfig })
    reply = json({ items: [], total: 0 })
    t.equal(
      await viewUrl(mkConf(['list', 'other'], { packageJson })),
      'https://p.example/acme/pub/-/stage?page=0&perPage=100&package=other',
    )
  })

  t.test('configured registry w/o publishConfig', async t => {
    const packageJson = local(t, {})
    t.equal(
      await viewUrl(mkConf(['view', ID], { packageJson })),
      `${REG}-/stage/${ID}`,
    )
  })

  t.test('no registry anywhere', async t => {
    const packageJson = local(t, {})
    await t.rejects(
      Stage.command(
        mkConf(['view', ID], { packageJson, registry: undefined }),
      ),
      {
        message: /^Missing registry configuration/,
        cause: { code: 'ECONFIG' },
      },
    )
    t.strictSame(sent, [])
  })
})
