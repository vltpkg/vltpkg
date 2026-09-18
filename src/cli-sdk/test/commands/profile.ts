import { assertOk } from '@vltpkg/registry-client'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const profileData = {
  name: 'testuser',
  email: 'test@example.com',
  created: '2025-01-01T00:00:00.000Z',
  updated: '2025-06-01T00:00:00.000Z',
  tfa: false,
}

const requestLog: { url: string; opts: Record<string, unknown> }[] =
  []

const Command = await t.mockImport<
  typeof import('../../src/commands/profile.ts')
>('../../src/commands/profile.ts', {
  '@vltpkg/registry-client': {
    assertOk,
    RegistryClient: class {
      async request(
        url: string | URL,
        opts: Record<string, unknown>,
      ) {
        requestLog.push({ url: String(url), opts })
        return {
          statusCode: 200,
          json: () => ({ ...profileData }),
        }
      }
    },
  },
})

t.matchSnapshot(Command.usage().usageMarkdown())

t.test('get all profile data', async t => {
  requestLog.length = 0
  const config = {
    options: { registry: 'https://registry' },
    positionals: ['get'],
  } as LoadedConfig

  const result = await Command.command(config)
  t.strictSame(result, profileData)
  t.equal(requestLog.length, 1)
  t.equal(requestLog[0]?.url, 'https://registry/-/npm/v1/user')
  t.strictSame(requestLog[0]?.opts, { useCache: false })
})

t.test('get single property', async t => {
  requestLog.length = 0
  const config = {
    options: { registry: 'https://registry' },
    positionals: ['get', 'name'],
  } as LoadedConfig

  const result = await Command.command(config)
  t.strictSame(result, { property: 'name', value: 'testuser' })
})

t.test('get unknown property', async t => {
  const config = {
    options: { registry: 'https://registry' },
    positionals: ['get', 'nonexistent'],
  } as LoadedConfig

  await t.rejects(Command.command(config), {
    cause: {
      code: 'EUSAGE',
      found: 'nonexistent',
    },
  })
})

t.test('set property', async t => {
  requestLog.length = 0

  const updatedData = { ...profileData, email: 'new@example.com' }
  const SetCommand = await t.mockImport<
    typeof import('../../src/commands/profile.ts')
  >('../../src/commands/profile.ts', {
    '@vltpkg/registry-client': {
      assertOk,
      RegistryClient: class {
        async request(
          url: string | URL,
          opts: Record<string, unknown>,
        ) {
          requestLog.push({ url: String(url), opts })
          return {
            statusCode: 200,
            json: () => ({ ...updatedData }),
          }
        }
      },
    },
  })

  const config = {
    options: { registry: 'https://registry' },
    positionals: ['set', 'email', 'new@example.com'],
  } as LoadedConfig

  const result = await SetCommand.command(config)
  t.strictSame(result, {
    property: 'email',
    value: 'new@example.com',
  })
  t.equal(requestLog.length, 1)
  t.equal(requestLog[0]?.url, 'https://registry/-/npm/v1/user')
  t.equal(requestLog[0]?.opts.method, 'POST')
  t.equal(
    requestLog[0]?.opts.body,
    JSON.stringify({ email: 'new@example.com' }),
  )
})

t.test('set with multiple words in value', async t => {
  const log: { url: string; opts: Record<string, unknown> }[] = []
  const SetCommand = await t.mockImport<
    typeof import('../../src/commands/profile.ts')
  >('../../src/commands/profile.ts', {
    '@vltpkg/registry-client': {
      assertOk,
      RegistryClient: class {
        async request(
          url: string | URL,
          opts: Record<string, unknown>,
        ) {
          log.push({ url: String(url), opts })
          return {
            statusCode: 200,
            json: () => ({
              ...profileData,
              fullname: 'Test User Name',
            }),
          }
        }
      },
    },
  })

  const config = {
    options: { registry: 'https://registry' },
    positionals: ['set', 'fullname', 'Test', 'User', 'Name'],
  } as LoadedConfig

  const result = await SetCommand.command(config)
  t.strictSame(result, {
    property: 'fullname',
    value: 'Test User Name',
  })
  t.equal(
    log[0]?.opts.body,
    JSON.stringify({ fullname: 'Test User Name' }),
  )
})

t.test('set missing property', async t => {
  const config = {
    options: { registry: 'https://registry' },
    positionals: ['set'],
  } as LoadedConfig

  await t.rejects(Command.command(config), {
    cause: { code: 'EUSAGE' },
  })
})

t.test('set missing value', async t => {
  const config = {
    options: { registry: 'https://registry' },
    positionals: ['set', 'email'],
  } as LoadedConfig

  await t.rejects(Command.command(config), {
    cause: { code: 'EUSAGE' },
  })
})

t.test('invalid subcommand', async t => {
  const config = {
    options: { registry: 'https://registry' },
    positionals: ['invalid'],
  } as LoadedConfig

  await t.rejects(Command.command(config), {
    cause: {
      code: 'EUSAGE',
      found: 'invalid',
      validOptions: ['get', 'set'],
    },
  })
})

t.test('no subcommand', async t => {
  const config = {
    options: { registry: 'https://registry' },
    positionals: ['x'],
  } as unknown as LoadedConfig
  config.positionals = []

  await t.rejects(Command.command(config), {
    cause: {
      code: 'EUSAGE',
      found: undefined,
      validOptions: ['get', 'set'],
    },
  })
})

t.test('views', async t => {
  t.test('human view - full profile', async t => {
    const result = Command.views.human({
      name: 'testuser',
      email: 'test@example.com',
    })
    t.equal(result, 'name: testuser\nemail: test@example.com')
  })

  t.test('human view - single property', async t => {
    const result = Command.views.human({
      property: 'name',
      value: 'testuser',
    })
    t.equal(result, 'testuser')
  })

  t.test('human view - null value', async t => {
    const result = Command.views.human({
      property: 'tfa',
      value: null,
    })
    t.equal(result, 'null')
  })

  t.test('human view - object value', async t => {
    const result = Command.views.human({
      property: 'details',
      value: { key: 'val' },
    })
    t.equal(result, '{"key":"val"}')
  })

  t.test('human view - number value', async t => {
    const result = Command.views.human({
      count: 42,
      active: true,
      removed: null,
      tags: ['a'],
    })
    t.equal(
      result,
      'count: 42\nactive: true\nremoved: null\ntags: ["a"]',
    )
  })

  t.test('json view', async t => {
    const data = { name: 'testuser' }
    t.strictSame(Command.views.json(data), data)
  })
})

t.test('a 401 reports auth, not a bogus usage error', async t => {
  // this used to raise EUSAGE 'Property not found in profile',
  // blaming the user's argument for an auth failure
  const Failing = await t.mockImport<
    typeof import('../../src/commands/profile.ts')
  >('../../src/commands/profile.ts', {
    '@vltpkg/registry-client': {
      assertOk,
      RegistryClient: class {
        async request() {
          return {
            statusCode: 401,
            text: () => '{"error":"unauthorized"}',
            json: () => ({ error: 'unauthorized' }),
          }
        }
      },
    },
  })

  for (const positionals of [
    ['get'],
    ['get', 'email'],
    ['set', 'email', 'a@b.com'],
  ]) {
    await t.rejects(
      Failing.command({
        options: { registry: 'https://registry' },
        positionals,
      } as LoadedConfig),
      {
        message:
          /: 401 Unauthorized — unauthorized\n⚠️ Not logged in to https:\/\/registry\./,
        cause: { code: 'ENEEDAUTH', status: 401 },
      },
      positionals.join(' '),
    )
  }
})

t.test('a server error carries no login advice', async t => {
  const Failing = await t.mockImport<
    typeof import('../../src/commands/profile.ts')
  >('../../src/commands/profile.ts', {
    '@vltpkg/registry-client': {
      assertOk,
      RegistryClient: class {
        async request() {
          return { statusCode: 500, text: () => 'kaboom' }
        }
      },
    },
  })
  for (const positionals of [['get'], ['set', 'email', 'a@b.com']]) {
    await t.rejects(
      Failing.command({
        options: { registry: 'https://registry' },
        positionals,
      } as LoadedConfig),
      {
        message: /: 500 Internal Server Error — kaboom$/,
        cause: { code: 'EREQUEST', status: 500 },
      },
      positionals.join(' '),
    )
  }
})
