import { PackageJson } from '@vltpkg/package-json'
import * as RC from '@vltpkg/registry-client'
import t from 'tap'
import type { Test } from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

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
  text?: () => string
}
const sent: Sent[] = []
let reply: (url: string) => Reply

const Trust = await t.mockImport<
  typeof import('../../src/commands/trust.ts')
>('../../src/commands/trust.ts', {
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
const headers = { 'npm-auth-type': 'web', 'npm-command': 'trust' }
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

const item = {
  type: 'github',
  id: ID,
  file: 'release.yml',
  repository: 'acme/utils',
  environment: 'production',
  permissions: ['createPackage', 'createStagedPackage'],
}

t.beforeEach(() => {
  sent.length = 0
  reply = () => ({ statusCode: 200, json: () => [] })
})

t.test('usage', async t => {
  t.matchSnapshot(Trust.usage().usage())
})

t.test('views', async t => {
  const { human, json } = Trust.views
  t.matchSnapshot(human([]), 'none')
  t.matchSnapshot(
    human([
      item,
      { type: 'github', file: 'ci.yaml', permissions: ['other'] },
      { id: ID },
    ]),
    'list',
  )
  const revoked = { package: '@acme/pkg', id: ID, revoked: true }
  t.matchSnapshot(human(revoked), 'revoked')
  t.matchSnapshot(human({ ...revoked, revoked: false }), 'dry run')
  t.equal(json(revoked), revoked)
})

t.test('a subcommand is required', async t => {
  const validOptions = ['list', 'ls', 'revoke']
  await t.rejects(Trust.command(mkConf([])), {
    message: 'trust command requires a subcommand',
    cause: { code: 'EUSAGE', validOptions },
  })
  await t.rejects(Trust.command(mkConf(['frobnicate', 'foo'])), {
    message: 'Invalid trust subcommand',
    cause: { code: 'EUSAGE', found: 'frobnicate', validOptions },
  })
  t.strictSame(sent, [])
})

t.test('list', async t => {
  reply = () => ({
    statusCode: 200,
    json: () => [
      {
        id: ID,
        type: 'github',
        claims: {
          repository: 'acme/utils',
          workflow_ref: { file: 'release.yml' },
          environment: 'production',
        },
        permissions: ['createPackage', 'createStagedPackage'],
      },
      { type: 'github', claims: {} },
      {},
    ],
  })
  const items = await Trust.command(mkConf(['list', '@acme/pkg']))
  t.strictSame(items, [item, { type: 'github' }, {}])
  t.strictSame(
    Object.keys((items as object[])[0] ?? {}),
    Object.keys(item),
    'npm order',
  )
  t.strictSame(sent, [
    {
      url: `${REG}-/package/@acme%2fpkg/trust`,
      method: 'GET',
      useCache: false,
      headers,
      otp: undefined,
    },
  ])
  await Trust.command(mkConf(['ls', 'foo@1']))
  t.equal(
    sent.at(-1)?.url,
    `${REG}-/package/foo/trust`,
    'ls is an alias, a version is ignored',
  )
})

t.test('revoke', async t => {
  reply = () => ({ statusCode: 204 })
  t.strictSame(
    await Trust.command(
      mkConf(['revoke', '@acme/pkg'], { id: 'a/b', otp: '123456' }),
    ),
    { package: '@acme/pkg', id: 'a/b', revoked: true },
  )
  t.strictSame(sent, [
    {
      url: `${REG}-/package/@acme%2fpkg/trust/a%2Fb`,
      method: 'DELETE',
      useCache: false,
      headers,
      otp: '123456',
    },
  ])
})

// no registry configured: arguments are checked before it is resolved
t.test('arguments', async t => {
  const noRegistry = { registry: undefined }
  t.strictSame(
    await Trust.command(
      mkConf(['revoke', 'foo'], {
        ...noRegistry,
        id: ID,
        'dry-run': true,
      }),
    ),
    { package: 'foo', id: ID, revoked: false },
    'a dry run sends nothing',
  )
  for (const sub of ['list', 'revoke']) {
    await t.rejects(Trust.command(mkConf([sub], noRegistry)), {
      message:
        'Package name must be given as an argument or in package.json',
      cause: { code: 'EUSAGE' },
    })
  }
  await t.rejects(
    Trust.command(mkConf(['revoke', 'foo'], noRegistry)),
    {
      message:
        'Id of the trusted publisher to revoke must be given with --id',
      cause: { code: 'EUSAGE' },
    },
  )
  t.strictSame(sent, [])
})

t.test('registry errors', async t => {
  reply = () => ({ statusCode: 404, text: () => 'Not found' })
  await t.rejects(
    Trust.command(mkConf(['revoke', 'foo'], { id: ID })),
    {
      message: /^Failed to revoke trusted publisher: 404/,
      cause: { code: 'EREQUEST', status: 404, method: 'DELETE' },
    },
  )
  reply = () => {
    throw new Error('socket hang up')
  }
  await t.rejects(Trust.command(mkConf(['list', 'foo'])), {
    message: 'Failed to list trusted publishers: socket hang up',
  })
})

t.test('the package in the current directory', async t => {
  const local = (t: Test, manifest: Record<string, unknown>) => {
    t.chdir(
      t.testdir({
        'package.json': JSON.stringify({
          version: '1.0.0',
          publishConfig: { registry: 'https://p.example/acme/pub' },
          ...manifest,
        }),
      }),
    )
    return new PackageJson()
  }
  const listUrl = (conf: LoadedConfig) =>
    Trust.command(conf).then(() => sent.at(-1)?.url)

  t.test('its name and publishConfig.registry', async t => {
    const packageJson = local(t, { name: '@acme/pkg' })
    t.equal(
      await listUrl(
        mkConf(['list'], { packageJson, registry: undefined }),
      ),
      'https://p.example/acme/pub/-/package/@acme%2fpkg/trust',
    )
  })

  t.test('another package uses the configured registry', async t => {
    const packageJson = local(t, { name: '@acme/pkg' })
    t.equal(
      await listUrl(mkConf(['list', 'other'], { packageJson })),
      `${REG}-/package/other/trust`,
    )
  })

  t.test('no name', async t => {
    const packageJson = local(t, {})
    await t.rejects(
      Trust.command(mkConf(['list'], { packageJson })),
      {
        message:
          'Package name must be given as an argument or in package.json',
        cause: { code: 'EUSAGE' },
      },
    )
    t.strictSame(sent, [])
  })

  t.test('no registry anywhere', async t => {
    const packageJson = local(t, {
      name: 'pkg',
      publishConfig: undefined,
    })
    await t.rejects(
      Trust.command(
        mkConf(['list'], { packageJson, registry: undefined }),
      ),
      {
        message: /^Missing registry configuration/,
        cause: { code: 'ECONFIG' },
      },
    )
    t.strictSame(sent, [])
  })
})
