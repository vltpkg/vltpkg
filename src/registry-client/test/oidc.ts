import t from 'tap'
import type { Token } from '../src/auth.ts'

// Track tokens set during tests
const runtimeTokensSet: [string, Token][] = []
const mockAuth = {
  setRuntimeToken: (registry: string, token: Token) => {
    runtimeTokensSet.push([registry, token])
  },
}

// Helper to create a mock undici module
const createMockUndici = (
  handler: (
    url: URL,
    opts: {
      method: string
      headers: Record<string, string>
    },
  ) => Promise<{
    statusCode: number
    body: { json: () => Promise<unknown> }
  }>,
) => ({
  request: handler,
})

// Save original env vars and restore after each test
const savedEnv = { ...process.env }
const cleanEnv = () => {
  delete process.env.GITHUB_ACTIONS
  delete process.env.GITLAB_CI
  delete process.env.CIRCLECI
  delete process.env.NPM_ID_TOKEN
  delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
}

t.beforeEach(() => {
  cleanEnv()
  runtimeTokensSet.length = 0
})

t.afterEach(() => {
  Object.assign(process.env, savedEnv)
})

t.test('returns undefined when not in CI', async t => {
  const { oidc } = await t.mockImport<
    typeof import('../src/oidc.ts')
  >('../src/oidc.ts', {
    '../src/auth.ts': mockAuth,
    undici: createMockUndici(async () => {
      throw new Error('should not make requests')
    }),
  })

  const result = await oidc({
    packageName: '@scope/pkg',
    registry: 'https://registry.npmjs.org/',
  })
  t.equal(result, undefined)
  t.equal(runtimeTokensSet.length, 0)
})

t.test('GitHub Actions: uses NPM_ID_TOKEN override', async t => {
  process.env.GITHUB_ACTIONS = 'true'
  process.env.NPM_ID_TOKEN = 'my-id-token'

  const { oidc } = await t.mockImport<
    typeof import('../src/oidc.ts')
  >('../src/oidc.ts', {
    '../src/auth.ts': mockAuth,
    undici: createMockUndici(async (url, opts) => {
      // Should be the exchange request
      t.match(String(url), /oidc\/token\/exchange/)
      t.equal(opts.method, 'POST')
      t.equal(opts.headers.authorization, 'Bearer my-id-token')
      return {
        statusCode: 200,
        body: {
          json: async () => ({
            token: 'exchanged-token',
          }),
        },
      }
    }),
  })

  const result = await oidc({
    packageName: '@scope/pkg',
    registry: 'https://registry.npmjs.org/',
  })
  t.equal(result, 'Bearer exchanged-token')
  t.strictSame(runtimeTokensSet, [
    ['https://registry.npmjs.org/', 'Bearer exchanged-token'],
  ])
})

t.test(
  'GitHub Actions: fetches token from ACTIONS_ID_TOKEN_REQUEST_URL',
  async t => {
    process.env.GITHUB_ACTIONS = 'true'
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL =
      'https://token.actions.githubusercontent.com/request'
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'gha-token'

    let callCount = 0
    const { oidc } = await t.mockImport<
      typeof import('../src/oidc.ts')
    >('../src/oidc.ts', {
      '../src/auth.ts': mockAuth,
      undici: createMockUndici(async (url, opts) => {
        callCount++
        if (callCount === 1) {
          // ID token fetch from GitHub
          t.match(
            String(url),
            /token\.actions\.githubusercontent\.com/,
          )
          t.match(String(url), /audience=npm%3Aregistry\.npmjs\.org/)
          t.equal(opts.headers.authorization, 'Bearer gha-token')
          return {
            statusCode: 200,
            body: {
              json: async () => ({
                value: 'github-id-token',
              }),
            },
          }
        }
        // Token exchange
        t.match(String(url), /@scope%2Fpkg/)
        t.equal(opts.headers.authorization, 'Bearer github-id-token')
        return {
          statusCode: 200,
          body: {
            json: async () => ({
              token: 'registry-token',
            }),
          },
        }
      }),
    })

    const result = await oidc({
      packageName: '@scope/pkg',
      registry: 'https://registry.npmjs.org/',
    })
    t.equal(result, 'Bearer registry-token')
    t.equal(callCount, 2)
  },
)

t.test(
  'GitHub Actions: returns undefined when no id-token permissions',
  async t => {
    process.env.GITHUB_ACTIONS = 'true'
    // No ACTIONS_ID_TOKEN_REQUEST_URL or NPM_ID_TOKEN

    const { oidc } = await t.mockImport<
      typeof import('../src/oidc.ts')
    >('../src/oidc.ts', {
      '../src/auth.ts': mockAuth,
      undici: createMockUndici(async () => {
        throw new Error('should not make requests')
      }),
    })

    const result = await oidc({
      packageName: 'pkg',
      registry: 'https://registry.npmjs.org/',
    })
    t.equal(result, undefined)
    t.equal(runtimeTokensSet.length, 0)
  },
)

t.test(
  'GitHub Actions: returns undefined when id token fetch fails',
  async t => {
    process.env.GITHUB_ACTIONS = 'true'
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL =
      'https://token.actions.githubusercontent.com/request'
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'gha-token'

    // Include a sensitive key ("token") in the error body so the
    // recursive redaction branch is exercised in coverage.
    const logs: string[] = []
    const origError = console.error
    t.teardown(() => (console.error = origError))
    console.error = (...args: unknown[]) => logs.push(args.join(' '))

    const { oidc } = await t.mockImport<
      typeof import('../src/oidc.ts')
    >('../src/oidc.ts', {
      '../src/auth.ts': mockAuth,
      undici: createMockUndici(async () => ({
        statusCode: 403,
        body: {
          json: async () => ({
            error: 'forbidden',
            token: 'leaked-secret',
          }),
        },
      })),
    })

    const result = await oidc({
      packageName: 'pkg',
      registry: 'https://registry.npmjs.org/',
    })
    t.equal(result, undefined)

    // Verify sensitive value was redacted in logs
    const bodyLog = logs.find(l => l.includes('ID token error body'))
    t.ok(bodyLog, 'logged the error body')
    t.match(bodyLog, /\[REDACTED\]/)
    t.notMatch(bodyLog ?? '', /leaked-secret/)
  },
)

t.test(
  'GitHub Actions: logs non-JSON body when id token fetch returns non-200',
  async t => {
    process.env.GITHUB_ACTIONS = 'true'
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL =
      'https://token.actions.githubusercontent.com/request'
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'gha-token'

    const { oidc } = await t.mockImport<
      typeof import('../src/oidc.ts')
    >('../src/oidc.ts', {
      '../src/auth.ts': mockAuth,
      undici: createMockUndici(async () => ({
        statusCode: 403,
        body: {
          json: async () => {
            throw new Error('not json')
          },
        },
      })),
    })

    const result = await oidc({
      packageName: 'pkg',
      registry: 'https://registry.npmjs.org/',
    })
    t.equal(result, undefined)
  },
)

t.test(
  'GitHub Actions: returns undefined when id token response has no value',
  async t => {
    process.env.GITHUB_ACTIONS = 'true'
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL =
      'https://token.actions.githubusercontent.com/request'
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'gha-token'

    const { oidc } = await t.mockImport<
      typeof import('../src/oidc.ts')
    >('../src/oidc.ts', {
      '../src/auth.ts': mockAuth,
      undici: createMockUndici(async () => ({
        statusCode: 200,
        body: {
          json: async () => ({}),
        },
      })),
    })

    const result = await oidc({
      packageName: 'pkg',
      registry: 'https://registry.npmjs.org/',
    })
    t.equal(result, undefined)
  },
)

t.test('GitLab CI: uses NPM_ID_TOKEN', async t => {
  process.env.GITLAB_CI = 'true'
  process.env.NPM_ID_TOKEN = 'gitlab-id-token'

  const { oidc } = await t.mockImport<
    typeof import('../src/oidc.ts')
  >('../src/oidc.ts', {
    '../src/auth.ts': mockAuth,
    undici: createMockUndici(async (url, opts) => {
      t.match(String(url), /oidc\/token\/exchange/)
      t.equal(opts.headers.authorization, 'Bearer gitlab-id-token')
      return {
        statusCode: 200,
        body: {
          json: async () => ({
            token: 'gitlab-registry-tok',
          }),
        },
      }
    }),
  })

  const result = await oidc({
    packageName: 'my-pkg',
    registry: 'https://registry.npmjs.org/',
  })
  t.equal(result, 'Bearer gitlab-registry-tok')
})

t.test('CircleCI: uses NPM_ID_TOKEN', async t => {
  process.env.CIRCLECI = 'true'
  process.env.NPM_ID_TOKEN = 'circle-id-token'

  const { oidc } = await t.mockImport<
    typeof import('../src/oidc.ts')
  >('../src/oidc.ts', {
    '../src/auth.ts': mockAuth,
    undici: createMockUndici(async (_url, opts) => {
      t.equal(opts.headers.authorization, 'Bearer circle-id-token')
      return {
        statusCode: 200,
        body: {
          json: async () => ({
            token: 'circle-registry-tok',
          }),
        },
      }
    }),
  })

  const result = await oidc({
    packageName: 'my-pkg',
    registry: 'https://registry.npmjs.org/',
  })
  t.equal(result, 'Bearer circle-registry-tok')
})

t.test(
  'GitLab CI: returns undefined when no NPM_ID_TOKEN',
  async t => {
    process.env.GITLAB_CI = 'true'

    const { oidc } = await t.mockImport<
      typeof import('../src/oidc.ts')
    >('../src/oidc.ts', {
      '../src/auth.ts': mockAuth,
      undici: createMockUndici(async () => {
        throw new Error('should not make requests')
      }),
    })

    const result = await oidc({
      packageName: 'my-pkg',
      registry: 'https://registry.npmjs.org/',
    })
    t.equal(result, undefined)
  },
)

t.test('exchange returns undefined on non-200', async t => {
  process.env.GITHUB_ACTIONS = 'true'
  process.env.NPM_ID_TOKEN = 'some-token'

  const { oidc } = await t.mockImport<
    typeof import('../src/oidc.ts')
  >('../src/oidc.ts', {
    '../src/auth.ts': mockAuth,
    undici: createMockUndici(async () => ({
      statusCode: 500,
      body: {
        json: async () => ({
          error: 'server error',
        }),
      },
    })),
  })

  const result = await oidc({
    packageName: 'pkg',
    registry: 'https://registry.npmjs.org/',
  })
  t.equal(result, undefined)
  t.equal(runtimeTokensSet.length, 0)
})

t.test('exchange logs non-JSON body on non-200 response', async t => {
  process.env.GITHUB_ACTIONS = 'true'
  process.env.NPM_ID_TOKEN = 'some-token'

  const { oidc } = await t.mockImport<
    typeof import('../src/oidc.ts')
  >('../src/oidc.ts', {
    '../src/auth.ts': mockAuth,
    undici: createMockUndici(async () => ({
      statusCode: 500,
      body: {
        json: async () => {
          throw new Error('not json')
        },
      },
    })),
  })

  const result = await oidc({
    packageName: 'pkg',
    registry: 'https://registry.npmjs.org/',
  })
  t.equal(result, undefined)
  t.equal(runtimeTokensSet.length, 0)
})

t.test(
  'exchange returns undefined when response has no token',
  async t => {
    process.env.GITHUB_ACTIONS = 'true'
    process.env.NPM_ID_TOKEN = 'some-token'

    const { oidc } = await t.mockImport<
      typeof import('../src/oidc.ts')
    >('../src/oidc.ts', {
      '../src/auth.ts': mockAuth,
      undici: createMockUndici(async () => ({
        statusCode: 200,
        body: {
          json: async () => ({}),
        },
      })),
    })

    const result = await oidc({
      packageName: 'pkg',
      registry: 'https://registry.npmjs.org/',
    })
    t.equal(result, undefined)
    t.equal(runtimeTokensSet.length, 0)
  },
)

t.test('unscoped package name in exchange URL', async t => {
  process.env.GITHUB_ACTIONS = 'true'
  process.env.NPM_ID_TOKEN = 'some-token'

  const { oidc } = await t.mockImport<
    typeof import('../src/oidc.ts')
  >('../src/oidc.ts', {
    '../src/auth.ts': mockAuth,
    undici: createMockUndici(async url => {
      // Unscoped package: no encoding needed
      t.match(String(url), /\/package\/my-package$/)
      return {
        statusCode: 200,
        body: {
          json: async () => ({ token: 'tok' }),
        },
      }
    }),
  })

  const result = await oidc({
    packageName: 'my-package',
    registry: 'https://registry.npmjs.org/',
  })
  t.equal(result, 'Bearer tok')
})

t.test(
  'scoped package name in exchange URL encodes correctly',
  async t => {
    process.env.GITHUB_ACTIONS = 'true'
    process.env.NPM_ID_TOKEN = 'some-token'

    const { oidc } = await t.mockImport<
      typeof import('../src/oidc.ts')
    >('../src/oidc.ts', {
      '../src/auth.ts': mockAuth,
      undici: createMockUndici(async url => {
        // @scope/name → @scope%2Fname
        t.match(String(url), /\/package\/@scope%2Fname$/)
        return {
          statusCode: 200,
          body: {
            json: async () => ({
              token: 'scoped-tok',
            }),
          },
        }
      }),
    })

    const result = await oidc({
      packageName: '@scope/name',
      registry: 'https://registry.npmjs.org/',
    })
    t.equal(result, 'Bearer scoped-tok')
  },
)
