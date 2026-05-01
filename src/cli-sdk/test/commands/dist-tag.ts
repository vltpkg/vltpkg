import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

let requestLog: {
  url: string
  method: string
  body?: string
  headers?: Record<string, string>
}[] = []
let mockResponse: {
  statusCode: number
  json: () => unknown
} = { statusCode: 200, json: () => ({}) }

const Command = await t.mockImport<
  typeof import('../../src/commands/dist-tag.ts')
>('../../src/commands/dist-tag.ts', {
  '@vltpkg/registry-client': {
    RegistryClient: class {
      async request(
        url: string | URL,
        options: {
          method?: string
          headers?: Record<string, string>
          body?: string
          useCache?: false
        } = {},
      ) {
        requestLog.push({
          url: String(url),
          method: options.method ?? 'GET',
          body: options.body,
          headers: options.headers,
        })
        return mockResponse
      }
    },
  },
  '@vltpkg/spec': {
    Spec: {
      parseArgs(spec: string) {
        const at = spec.lastIndexOf('@')
        if (at > 0) {
          return {
            name: spec.substring(0, at),
            bareSpec: spec.substring(at + 1),
          }
        }
        return { name: spec, bareSpec: '' }
      },
    },
  },
})

t.beforeEach(() => {
  requestLog = []
  mockResponse = { statusCode: 200, json: () => ({}) }
})

const makeConfig = (
  positionals: string[],
  overrides?: Partial<LoadedConfig>,
): LoadedConfig =>
  ({
    options: {
      registry: 'https://registry.npmjs.org/',
      tag: 'latest',
      packageJson: {
        maybeRead() {
          return { name: 'my-package' }
        },
      },
    },
    positionals,
    projectRoot: '/some/project',
    ...overrides,
  }) as unknown as LoadedConfig

t.matchSnapshot(Command.usage().usageMarkdown())

t.test('add subcommand', async t => {
  t.test('adds a dist-tag with explicit tag', async t => {
    const result = await Command.command(
      makeConfig(['add', 'my-pkg@1.2.3', 'beta']),
    )
    t.strictSame(result, {
      id: 'my-pkg',
      tag: 'beta',
      version: '1.2.3',
    })
    t.equal(requestLog.length, 1)
    t.equal(
      requestLog[0]?.url,
      'https://registry.npmjs.org/-/package/my-pkg/dist-tags/beta',
    )
    t.equal(requestLog[0]?.method, 'PUT')
    t.equal(requestLog[0]?.body, '"1.2.3"')
  })

  t.test('adds a dist-tag defaulting to configured tag', async t => {
    const result = await Command.command(
      makeConfig(['add', 'my-pkg@2.0.0']),
    )
    t.strictSame(result, {
      id: 'my-pkg',
      tag: 'latest',
      version: '2.0.0',
    })
    t.equal(
      requestLog[0]?.url,
      'https://registry.npmjs.org/-/package/my-pkg/dist-tags/latest',
    )
  })

  t.test('handles scoped packages', async t => {
    const result = await Command.command(
      makeConfig(['add', '@scope/my-pkg@1.0.0', 'next']),
    )
    t.strictSame(result, {
      id: '@scope/my-pkg',
      tag: 'next',
      version: '1.0.0',
    })
    t.equal(
      requestLog[0]?.url,
      'https://registry.npmjs.org/-/package/@scope%2fmy-pkg/dist-tags/next',
    )
  })

  t.test('throws without spec argument', async t => {
    await t.rejects(Command.command(makeConfig(['add'])), {
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('throws without version in spec', async t => {
    await t.rejects(Command.command(makeConfig(['add', 'my-pkg'])), {
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('throws on failed response', async t => {
    mockResponse = { statusCode: 403, json: () => ({}) }
    await t.rejects(
      Command.command(makeConfig(['add', 'my-pkg@1.0.0', 'beta'])),
      { message: /Failed to add dist-tag/ },
    )
  })
})

t.test('rm subcommand', async t => {
  t.test('removes a dist-tag', async t => {
    const result = await Command.command(
      makeConfig(['rm', 'my-pkg', 'beta']),
    )
    t.strictSame(result, { id: 'my-pkg', tag: 'beta' })
    t.equal(requestLog.length, 1)
    t.equal(
      requestLog[0]?.url,
      'https://registry.npmjs.org/-/package/my-pkg/dist-tags/beta',
    )
    t.equal(requestLog[0]?.method, 'DELETE')
  })

  t.test('remove alias works', async t => {
    const result = await Command.command(
      makeConfig(['remove', 'my-pkg', 'alpha']),
    )
    t.strictSame(result, { id: 'my-pkg', tag: 'alpha' })
    t.equal(requestLog[0]?.method, 'DELETE')
  })

  t.test('throws without both arguments', async t => {
    await t.rejects(Command.command(makeConfig(['rm', 'my-pkg'])), {
      cause: { code: 'EUSAGE' },
    })
    await t.rejects(Command.command(makeConfig(['rm'])), {
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('throws on failed response', async t => {
    mockResponse = { statusCode: 404, json: () => ({}) }
    await t.rejects(
      Command.command(makeConfig(['rm', 'my-pkg', 'beta'])),
      { message: /Failed to remove dist-tag/ },
    )
  })
})

t.test('ls subcommand', async t => {
  t.test('lists dist-tags for a package', async t => {
    mockResponse = {
      statusCode: 200,
      json: () => ({ latest: '1.0.0', beta: '2.0.0-beta.1' }),
    }
    const result = await Command.command(makeConfig(['ls', 'my-pkg']))
    t.strictSame(result, {
      id: 'my-pkg',
      tags: { latest: '1.0.0', beta: '2.0.0-beta.1' },
    })
    t.equal(requestLog.length, 1)
    t.equal(
      requestLog[0]?.url,
      'https://registry.npmjs.org/-/package/my-pkg/dist-tags',
    )
    t.equal(requestLog[0]?.method, 'GET')
  })

  t.test('list alias works', async t => {
    mockResponse = {
      statusCode: 200,
      json: () => ({ latest: '1.0.0' }),
    }
    const result = await Command.command(
      makeConfig(['list', 'my-pkg']),
    )
    t.strictSame(result, {
      id: 'my-pkg',
      tags: { latest: '1.0.0' },
    })
  })

  t.test(
    'defaults to package.json name when no arg provided',
    async t => {
      mockResponse = {
        statusCode: 200,
        json: () => ({ latest: '3.0.0' }),
      }
      const result = await Command.command(makeConfig(['ls']))
      t.strictSame(result, {
        id: 'my-package',
        tags: { latest: '3.0.0' },
      })
      t.equal(
        requestLog[0]?.url,
        'https://registry.npmjs.org/-/package/my-package/dist-tags',
      )
    },
  )

  t.test('throws when no package name available', async t => {
    await t.rejects(
      Command.command(
        makeConfig(['ls'], {
          options: {
            registry: 'https://registry.npmjs.org/',
            tag: 'latest',
            packageJson: {
              maybeRead() {
                return null
              },
            },
          },
        } as unknown as Partial<LoadedConfig>),
      ),
      { cause: { code: 'EUSAGE' } },
    )
  })

  t.test('throws on failed response', async t => {
    mockResponse = { statusCode: 404, json: () => ({}) }
    await t.rejects(
      Command.command(makeConfig(['ls', 'nonexistent'])),
      { message: /Failed to list dist-tags/ },
    )
  })
})

t.test('invalid subcommand', async t => {
  await t.rejects(Command.command(makeConfig(['wat'])), {
    cause: { code: 'EUSAGE' },
  })
})

t.test('missing subcommand', async t => {
  await t.rejects(Command.command(makeConfig([])), {
    cause: { code: 'EUSAGE' },
  })
})

t.test('views', async t => {
  t.test('human view for ls result', async t => {
    const lsResult = {
      id: 'my-pkg',
      tags: { latest: '1.0.0', beta: '2.0.0-beta.1' },
    }
    t.equal(
      Command.views.human(lsResult),
      'latest: 1.0.0\nbeta: 2.0.0-beta.1',
    )
  })

  t.test('human view for ls result with no tags', async t => {
    const lsResult = {
      id: 'my-pkg',
      tags: {},
    }
    t.equal(Command.views.human(lsResult), 'No dist-tags found.')
  })

  t.test('human view for add result', async t => {
    const addResult = {
      id: 'my-pkg',
      tag: 'beta',
      version: '1.2.3',
    }
    t.equal(Command.views.human(addResult), '+beta: my-pkg@1.2.3')
  })

  t.test('human view for rm result', async t => {
    const rmResult = {
      id: 'my-pkg',
      tag: 'beta',
    }
    t.equal(Command.views.human(rmResult), '-beta: my-pkg')
  })

  t.test('json view returns result as-is', async t => {
    const result = { id: 'my-pkg', tags: { latest: '1.0.0' } }
    t.strictSame(Command.views.json(result), result)
  })
})
