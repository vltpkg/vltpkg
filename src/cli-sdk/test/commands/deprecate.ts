import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Packument } from '@vltpkg/types'

let requestUrl: string | URL = ''
let requestOptions: Record<string, unknown> = {}
let requestBody = ''
let mockResponse: {
  statusCode: number
} | null = null
let mockRequestError: Error | null = null

let mockPackument: Packument = {
  name: 'my-package',
  'dist-tags': { latest: '2.0.0' },
  versions: {
    '1.0.0': {
      name: 'my-package',
      version: '1.0.0',
      dist: {
        tarball:
          'https://registry.npmjs.org/my-package/-/my-package-1.0.0.tgz',
        integrity: 'sha512-abc',
      },
    },
    '1.1.0': {
      name: 'my-package',
      version: '1.1.0',
      dist: {
        tarball:
          'https://registry.npmjs.org/my-package/-/my-package-1.1.0.tgz',
        integrity: 'sha512-def',
      },
    },
    '2.0.0': {
      name: 'my-package',
      version: '2.0.0',
      dist: {
        tarball:
          'https://registry.npmjs.org/my-package/-/my-package-2.0.0.tgz',
        integrity: 'sha512-ghi',
      },
    },
  },
}

const Command = await t.mockImport<
  typeof import('../../src/commands/deprecate.ts')
>('../../src/commands/deprecate.ts', {
  '@vltpkg/registry-client': {
    RegistryClient: class {
      async request(
        url: string | URL,
        options: Record<string, unknown>,
      ) {
        requestUrl = url
        requestOptions = options
        if (options.body) {
          requestBody = options.body as string
        }
        if (mockRequestError) {
          throw mockRequestError
        }
        return mockResponse
      }
    },
  },
  '@vltpkg/package-info': {
    PackageInfoClient: class {
      async packument() {
        return mockPackument
      }
    },
  },
})

t.matchSnapshot(Command.usage().usageMarkdown())

const makeConfig = (positionals: string[]): LoadedConfig =>
  ({
    options: {
      registry: 'https://registry.npmjs.org/',
      otp: undefined,
    },
    positionals,
  }) as unknown as LoadedConfig

t.beforeEach(() => {
  mockResponse = { statusCode: 200 }
  mockRequestError = null
  requestUrl = ''
  requestOptions = {}
  requestBody = ''
  mockPackument = {
    name: 'my-package',
    'dist-tags': { latest: '2.0.0' },
    versions: {
      '1.0.0': {
        name: 'my-package',
        version: '1.0.0',
        dist: {
          tarball:
            'https://registry.npmjs.org/my-package/-/my-package-1.0.0.tgz',
          integrity: 'sha512-abc',
        },
      },
      '1.1.0': {
        name: 'my-package',
        version: '1.1.0',
        dist: {
          tarball:
            'https://registry.npmjs.org/my-package/-/my-package-1.1.0.tgz',
          integrity: 'sha512-def',
        },
      },
      '2.0.0': {
        name: 'my-package',
        version: '2.0.0',
        dist: {
          tarball:
            'https://registry.npmjs.org/my-package/-/my-package-2.0.0.tgz',
          integrity: 'sha512-ghi',
        },
      },
    },
  }
})

t.test('deprecate all versions', async t => {
  const result = await Command.command(
    makeConfig(['my-package', 'this package is deprecated']),
  )
  t.equal(result.name, 'my-package')
  t.equal(result.version, '*')
  t.equal(result.message, 'this package is deprecated')
  t.strictSame(result.versions.sort(), ['1.0.0', '1.1.0', '2.0.0'])

  const body = JSON.parse(requestBody) as {
    _id: string
    name: string
    versions: Record<string, { deprecated: string }>
  }
  t.equal(body.name, 'my-package')
  t.equal(body._id, 'my-package')
  t.equal(
    body.versions['1.0.0']?.deprecated,
    'this package is deprecated',
  )
  t.equal(
    body.versions['1.1.0']?.deprecated,
    'this package is deprecated',
  )
  t.equal(
    body.versions['2.0.0']?.deprecated,
    'this package is deprecated',
  )
})

t.test('deprecate specific version range', async t => {
  const result = await Command.command(
    makeConfig(['my-package@<2.0.0', 'old version, please update']),
  )
  t.equal(result.name, 'my-package')
  t.equal(result.version, '<2.0.0')
  t.equal(result.message, 'old version, please update')
  t.strictSame(result.versions.sort(), ['1.0.0', '1.1.0'])

  const body = JSON.parse(requestBody) as {
    versions: Record<string, { deprecated: string }>
  }
  t.equal(
    body.versions['1.0.0']?.deprecated,
    'old version, please update',
  )
  t.equal(
    body.versions['1.1.0']?.deprecated,
    'old version, please update',
  )
  t.notOk(body.versions['2.0.0'])
})

t.test('un-deprecate with empty message', async t => {
  const result = await Command.command(makeConfig(['my-package', '']))
  t.equal(result.name, 'my-package')
  t.equal(result.message, '')
  t.equal(result.versions.length, 3)

  const body = JSON.parse(requestBody) as {
    versions: Record<string, { deprecated: string | undefined }>
  }
  t.equal(body.versions['1.0.0']?.deprecated, undefined)
  t.equal(body.versions['1.1.0']?.deprecated, undefined)
  t.equal(body.versions['2.0.0']?.deprecated, undefined)
})

t.test('scoped package', async t => {
  mockPackument = {
    name: '@scope/my-package',
    'dist-tags': { latest: '1.0.0' },
    versions: {
      '1.0.0': {
        name: '@scope/my-package',
        version: '1.0.0',
        dist: {
          tarball:
            'https://registry.npmjs.org/@scope/my-package/-/my-package-1.0.0.tgz',
          integrity: 'sha512-abc',
        },
      },
    },
  }

  const result = await Command.command(
    makeConfig(['@scope/my-package', 'deprecated']),
  )
  t.equal(result.name, '@scope/my-package')
  t.match(
    String(requestUrl),
    '@scope%2Fmy-package',
    'scoped package name is URL-encoded',
  )
})

t.test('error: unknown package name', async t => {
  const UnknownCommand = await t.mockImport<
    typeof import('../../src/commands/deprecate.ts')
  >('../../src/commands/deprecate.ts', {
    '@vltpkg/registry-client': {
      RegistryClient: class {
        async request() {
          return { statusCode: 200 }
        }
      },
    },
    '@vltpkg/package-info': {
      PackageInfoClient: class {
        async packument() {
          return mockPackument
        }
      },
    },
    '@vltpkg/spec': {
      Spec: {
        parseArgs: () => ({
          name: '(unknown)',
          bareSpec: '*',
        }),
      },
    },
  })
  await t.rejects(
    UnknownCommand.command(
      makeConfig(['git://github.com/user/repo', 'deprecated']),
    ),
    {
      message: /could not determine package name from spec/,
    },
  )
})

t.test('error: no spec argument', async t => {
  await t.rejects(Command.command(makeConfig([])), {
    message: /deprecate requires a package spec and message/,
  })
})

t.test('error: no message argument', async t => {
  await t.rejects(Command.command(makeConfig(['my-package'])), {
    message: /deprecate requires a message/,
  })
})

t.test('error: no matching versions', async t => {
  await t.rejects(
    Command.command(makeConfig(['my-package@>99.0.0', 'deprecated'])),
    {
      message: /no versions found matching the spec/,
    },
  )
})

t.test('error: request failure', async t => {
  mockRequestError = new Error('Network error')
  await t.rejects(
    Command.command(makeConfig(['my-package', 'deprecated'])),
    {
      message: /failed to update deprecation status/,
    },
  )
})

t.test('error: non-200 response', async t => {
  mockResponse = { statusCode: 403 }
  await t.rejects(
    Command.command(makeConfig(['my-package', 'deprecated'])),
    {
      message: /failed to update deprecation status/,
    },
  )
})

t.test('otp is passed through', async t => {
  const result = await Command.command({
    options: {
      registry: 'https://registry.npmjs.org/',
      otp: '123456',
    },
    positionals: ['my-package', 'deprecated'],
  } as unknown as LoadedConfig)
  t.equal(result.name, 'my-package')
  t.equal(requestOptions.otp, '123456')
})

t.test('request headers', async t => {
  await Command.command(makeConfig(['my-package', 'deprecated']))
  t.equal(requestOptions.method, 'PUT')
  t.strictSame(requestOptions.headers, {
    'content-type': 'application/json',
    'npm-auth-type': 'web',
    'npm-command': 'deprecate',
  })
})

t.test('201 response is accepted', async t => {
  mockResponse = { statusCode: 201 }
  const result = await Command.command(
    makeConfig(['my-package', 'deprecated']),
  )
  t.equal(result.name, 'my-package')
})

t.test('views', async t => {
  const deprecateResult = {
    name: 'my-package',
    version: '<2.0.0',
    message: 'critical bug',
    versions: ['1.0.0', '1.1.0'],
  }

  const undeprecateResult = {
    name: 'my-package',
    version: '*',
    message: '',
    versions: ['1.0.0', '1.1.0', '2.0.0'],
  }

  const singleResult = {
    name: 'my-package',
    version: '1.0.0',
    message: 'deprecated',
    versions: ['1.0.0'],
  }

  const singleUndeprecateResult = {
    name: 'my-package',
    version: '1.0.0',
    message: '',
    versions: ['1.0.0'],
  }

  t.equal(
    Command.views.human(deprecateResult),
    '⚠️ Deprecated my-package@<2.0.0 (2 versions): critical bug',
  )
  t.equal(
    Command.views.human(undeprecateResult),
    '✅ Un-deprecated my-package@* (3 versions)',
  )
  t.equal(
    Command.views.human(singleResult),
    '⚠️ Deprecated my-package@1.0.0 (1 version): deprecated',
  )
  t.equal(
    Command.views.human(singleUndeprecateResult),
    '✅ Un-deprecated my-package@1.0.0 (1 version)',
  )
  t.strictSame(Command.views.json(deprecateResult), deprecateResult)
})
