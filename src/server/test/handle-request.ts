import { joinDepIDTuple } from '@vltpkg/dep-id'
import * as GRAPH from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'
import type { IncomingMessage, ServerResponse } from 'http'
import { resolve } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'
import type { HandleStaticOptions } from '../src/handle-static.ts'
import type { VltServerListening } from '../src/index.ts'

class MockServer {
  log: [string, ...unknown[]][] = []

  options = {
    projectRoot: '/some/project/root',
  }

  emit(event: string, data: unknown) {
    this.log.push(['emit', event, data])
  }

  update() {
    this.log.push(['update'])
  }

  updateGraph() {
    this.log.push(['updateGraph'])
  }
}

const ms = new MockServer()
const mockServer = ms as unknown as VltServerListening
t.beforeEach(t => {
  // tests named for their request path get the HTTP context
  if (!t.name.startsWith('/')) return

  ms.log.length = 0
  t.context = {
    server: mockServer,
    res: {} as unknown as ServerResponse,
    // default to what we'll usually be testing, can always override
    req: {
      method: 'POST',
      url: t.name.replace(/ .*$/, ''),
    } as unknown as IncomingMessage,
  }
})

// cast off the `any`, so we will catch type errors in methods
const getContext = (
  t: Test,
): {
  server: VltServerListening
  res: ServerResponse
  req: IncomingMessage
} => t.context

t.test('/handle-static', async t => {
  const context = getContext(t)

  let handleStaticCalled = false
  const handleStatic = (
    req: IncomingMessage,
    res: ServerResponse,
    server: HandleStaticOptions,
  ) => {
    t.equal(req, context.req)
    t.equal(res, context.res)
    t.equal(server, context.server)
    handleStaticCalled = true
  }

  context.req.method = 'GET'

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/handle-static.ts': { handleStatic },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(handleStaticCalled, true)
})

t.test('/404', async t => {
  const context = getContext(t)
  let errorCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: '/a/new/path' }
      },
      error: (
        res: ServerResponse,
        message: string,
        undef: undefined,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(message, 'Not found')
        t.equal(undef, undefined)
        t.equal(code, 404)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
  t.strictSame(ms.log, [])
})

t.test('/select-project path not a string', async t => {
  const context = getContext(t)
  let errorCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: { not: 'a string' } }
      },
      error: (
        res: ServerResponse,
        msg: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(msg, 'Bad request')
        t.equal(error, 'Project path must be a string')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
  t.strictSame(ms.log, [])
})

t.test('/select-project', async t => {
  const context = getContext(t)
  let okCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: '/a/new/path' }
      },
      ok: (res: ServerResponse, data: unknown) => {
        t.equal(res, context.res)
        t.equal(data, 'ok')
        okCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.strictSame(ms.log, [
    ['emit', 'needConfigUpdate', '/a/new/path'],
    ['update'],
  ])
})

t.test('/create-project path not string', async t => {
  const context = getContext(t)
  let errorCalled = false
  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      error: (
        res: ServerResponse,
        message: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(message, 'Bad request')
        t.equal(error, 'Project path must be a string')
        t.equal(code, 400)
        errorCalled = true
      },
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: { not: 'a string' } }
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
  t.strictSame(ms.log, [])
})

t.test('bad project names', async t => {
  const cases = {
    longName: 'x'.repeat(129),
    notString: true,
    badChars: 'Not A Valid Name',
  }
  for (const [testCase, name] of Object.entries(cases)) {
    t.test(`/create-project ${testCase}`, async t => {
      const context = getContext(t)
      let errorCalled = false
      const { handleRequest } = await t.mockImport<
        typeof import('../src/handle-request.ts')
      >('../src/handle-request.ts', {
        '../src/json.ts': {
          error: (
            res: ServerResponse,
            message: string,
            error: string,
            code: number,
          ) => {
            t.equal(res, context.res)
            t.equal(message, 'Bad request')
            t.equal(
              error,
              'Project name must be lowercase, alphanumeric, and may contain hyphens',
            )
            t.equal(code, 400)
            errorCalled = true
          },
          read: async (req: IncomingMessage) => {
            t.equal(req, context.req)
            return { path: '/some/new/path', name }
          },
        },
      })
      await handleRequest(context.req, context.res, context.server)
      t.equal(errorCalled, true)
      t.strictSame(ms.log, [])
    })
  }
})

t.test('/create-project author not string', async t => {
  const context = getContext(t)
  let errorCalled = false
  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      error: (
        res: ServerResponse,
        message: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(message, 'Bad request')
        t.equal(error, 'Project author must be a string if specified')
        t.equal(code, 400)
        errorCalled = true
      },
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {
          path: '/some/path',
          name: 'valid-name',
          author: true,
        }
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
  t.strictSame(ms.log, [])
})

t.test('/create-project init fail', async t => {
  const context = getContext(t)
  let errorCalled = false
  const initError = new Error('oopsie doopsie')

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      error: (
        res: ServerResponse,
        message: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(message, 'CLI Error')
        t.equal(error, 'oopsie doopsie')
        t.equal(code, 500)
        errorCalled = true
      },
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {
          path: t.testdirName,
          name: 'valid-name',
          author: 'Mr. Rogers',
        }
      },
    },
    '@vltpkg/init': {
      init: () => {
        throw initError
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
  t.strictSame(ms.log, [])
})

t.test('/create-project success', async t => {
  const context = getContext(t)
  let initCalled = false
  let installCalled = false
  let okCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      ok: (res: ServerResponse, data: string) => {
        t.equal(data, 'ok')
        t.equal(res, context.res)
        okCalled = true
      },
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {
          path: t.testdirName,
          name: 'valid-name',
          author: 'Mr. Rogers',
        }
      },
    },
    '@vltpkg/graph': t.createMock(GRAPH, {
      install: () => {
        installCalled = true
      },
    }),
    '@vltpkg/init': {
      init: () => {
        initCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.equal(initCalled, true)
  t.equal(installCalled, true)
  t.strictSame(ms.log, [
    [
      'emit',
      'needConfigUpdate',
      resolve(t.testdirName, 'valid-name'),
    ],
    ['emit', 'needConfigUpdate', '/some/project/root'],
    ['update'],
  ])
})

t.test('/install no add arg', async t => {
  const context = getContext(t)
  let errorCalled = false
  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {}
      },
      error: (
        res: ServerResponse,
        msg: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(msg, 'Bad request')
        t.equal(
          error,
          'GUI install endpoint called without add argument',
        )
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
  t.strictSame(ms.log, [])
})

t.test('/install error', async t => {
  const context = getContext(t)
  let errorCalled = false
  const depid = joinDepIDTuple(['file', '.'])

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {
          add: {
            [depid]: {
              abbrev: {
                spec: '*',
                type: 'prod',
              },
            },
          },
        }
      },
      error: (
        res: ServerResponse,
        msg: string,
        error: Error,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(msg, 'Install failed')
        t.equal(error.message, 'Some installation error')
        t.equal(code, 500)
        errorCalled = true
      },
    },
    '@vltpkg/graph': t.createMock(GRAPH, {
      install: async () => {
        throw new Error('Some installation error')
      },
    }),
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/install', async t => {
  const context = getContext(t)
  let okCalled = false
  let installCalled = false
  const depid = joinDepIDTuple(['file', '.'])

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {
          add: {
            [depid]: {
              abbrev: {
                spec: '*',
                type: 'prod',
              },
            },
          },
        }
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, 'ok')
        okCalled = true
      },
    },
    '@vltpkg/graph': t.createMock(GRAPH, {
      install: (
        options: GRAPH.InstallOptions,
        add?: GRAPH.AddImportersDependenciesMap,
      ) => {
        installCalled = true
        t.equal(options, context.server.options)
        t.same(
          add,
          new Map([
            [
              depid,
              new Map([
                [
                  'abbrev',
                  {
                    spec: Spec.parse(
                      'abbrev',
                      context.server.options,
                    ),
                    type: 'prod',
                  },
                ],
              ]),
            ],
          ]),
        )
      },
    }),
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.equal(installCalled, true)
})

t.test('/uninstall no args', async t => {
  const context = getContext(t)
  let errorCalled = false
  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {}
      },
      error: (
        res: ServerResponse,
        msg: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(msg, 'Bad request')
        t.equal(
          error,
          'GUI uninstall endpoint called without remove argument',
        )
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
  t.strictSame(ms.log, [])
})

t.test('/uninstall error', async t => {
  const context = getContext(t)
  let errorCalled = false
  const depid = joinDepIDTuple(['file', '.'])

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { remove: { [depid]: ['abbrev'] } }
      },
      error: (
        res: ServerResponse,
        msg: string,
        error: Error,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(msg, 'Uninstall failed')
        t.equal(error.message, 'Some uninstallation error')
        t.equal(code, 500)
        errorCalled = true
      },
    },
    '@vltpkg/graph': t.createMock(GRAPH, {
      uninstall: async () => {
        throw new Error('Some uninstallation error')
      },
    }),
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/uninstall', async t => {
  const context = getContext(t)
  let okCalled = false
  let uninstallCalled = false
  const depid = joinDepIDTuple(['file', '.'])

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { remove: { [depid]: ['abbrev'] } }
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, 'ok')
        okCalled = true
      },
    },
    '@vltpkg/graph': t.createMock(GRAPH, {
      uninstall: (
        options: GRAPH.InstallOptions,
        remove?: GRAPH.AddImportersDependenciesMap,
      ) => {
        uninstallCalled = true
        t.equal(options, context.server.options)
        t.same(remove, new Map([[depid, new Set(['abbrev'])]]))
      },
    }),
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.equal(uninstallCalled, true)
})

t.test('/config get entire config', async t => {
  const context = getContext(t)
  let okCalled = false
  let configGetCalled = false

  // Mock server config
  ;(context.server as any).config = {
    get: async (key?: string, which?: 'user' | 'project') => {
      configGetCalled = true
      t.equal(key, undefined, 'should call get without key')
      t.equal(which, 'project')
      return {
        registry: 'https://registry.npmjs.org/',
        cache: '/tmp/cache',
      }
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project' }
      },
      error: (
        _res: ServerResponse,
        _errType: string,
        _error: string,
        _code: number,
      ) => {},
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(
          data,
          '{"registry":"https://registry.npmjs.org/","cache":"/tmp/cache"}',
        )
        okCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.equal(configGetCalled, true)
})

t.test('/config get entire config as string', async t => {
  const context = getContext(t)
  let okCalled = false
  let configGetCalled = false

  ;(context.server as any).config = {
    get: async (key?: string, which?: 'user' | 'project') => {
      configGetCalled = true
      t.equal(key, undefined, 'should call get without key')
      t.equal(which, 'project')
      return 'hello-config'
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project' }
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, 'hello-config')
        okCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.equal(configGetCalled, true)
})

t.test('/config invalid pairs returns empty object', async t => {
  const context = getContext(t)
  let okCalled = false
  let errorCalled = false

  // server.config.get should not be called when pairs are invalid
  ;(context.server as any).config = {
    get: async () => {
      t.fail('config.get should not be called for invalid pairs')
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        // invalid: empty pairs array
        return { which: 'project', pairs: [] }
      },
      // normalizeKeyPairs will call error; provide a no-op to avoid throwing
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(
          error,
          'Config delete requires a non-empty keys array',
        )
        t.equal(code, 400)
        errorCalled = true
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, '{}')
        okCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.equal(errorCalled, true)
})

t.test('/config get specific key', async t => {
  const context = getContext(t)
  let okCalled = false
  let configGetCalled = false

  // Mock server config
  ;(context.server as any).config = {
    get: async (key?: string, which?: 'user' | 'project') => {
      configGetCalled = true
      t.equal(which, 'project')
      t.equal(key, 'registry', 'should call get with registry key')
      return 'https://registry.npmjs.org/'
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project', pairs: [{ key: 'registry' }] }
      },
      error: (
        _res: ServerResponse,
        _errType: string,
        _error: string,
        _code: number,
      ) => {},
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, '{"registry":"https://registry.npmjs.org/"}')
        okCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.equal(configGetCalled, true)
})

t.test('/config undefined result', async t => {
  const context = getContext(t)
  let okCalled = false

  // Mock server config
  ;(context.server as any).config = {
    get: async (_key?: string) => {
      return undefined
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project', pairs: [{ key: 'nonexistent' }] }
      },
      error: (
        _res: ServerResponse,
        _errType: string,
        _error: string,
        _code: number,
      ) => {},
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, '{}')
        okCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
})

t.test('/config error handling', async t => {
  const context = getContext(t)
  let errorCalled = false

  // Mock server config
  ;(context.server as any).config = {
    get: async (_key?: string) => {
      throw new Error('Config access failed')
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project', pairs: [{ key: 'registry' }] }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Config retrieval failed')
        t.equal(error, 'Config access failed')
        t.equal(code, 500)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/config/set', async t => {
  const context = getContext(t)
  let okCalled = false
  let configSetCalled = false

  // Mock server config
  ;(context.server as any).config = {
    setPairs: async (
      pairs: { key: string; value: string }[],
      which?: 'user' | 'project',
    ) => {
      configSetCalled = true
      t.same(pairs, [
        { key: 'registry', value: 'https://custom.registry.com/' },
      ])
      t.equal(which, 'project')
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {
          which: 'project',
          pairs: [
            {
              key: 'registry',
              value: 'https://custom.registry.com/',
            },
          ],
        }
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, 'Config values set successfully')
        okCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.equal(configSetCalled, true)
})

t.test('/config/set key not string', async t => {
  const context = getContext(t)
  let errorCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {
          which: 'project',
          pairs: [{ key: 123, value: 'some-value' }],
        }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(error, 'Each pair must have string key and value')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/config/set value not string', async t => {
  const context = getContext(t)
  let errorCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {
          which: 'project',
          pairs: [{ key: 'registry', value: 123 }],
        }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(error, 'Each pair must have string key and value')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/config/set empty pairs', async t => {
  const context = getContext(t)
  let errorCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project', pairs: [] }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(error, 'Config set requires a non-empty pairs array')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/config/set throws', async t => {
  const context = getContext(t)
  let errorCalled = false

  ;(context.server as any).config = {
    setPairs: async () => {
      throw new Error('Set operation failed')
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {
          which: 'project',
          pairs: [
            {
              key: 'registry',
              value: 'https://custom.registry.com/',
            },
          ],
        }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Config set failed')
        t.equal(error, 'Set operation failed')
        t.equal(code, 500)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/config/set error handling', async t => {
  const context = getContext(t)
  let errorCalled = false

  // Mock server config
  ;(context.server as any).config = {
    setPairs: async (_pairs: { key: string; value: string }[]) => {
      throw new Error('Set operation failed')
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        // Cause failure by omitting which so the handler hits the which validation
        return {
          pairs: [
            {
              key: 'registry',
              value: 'https://custom.registry.com/',
            },
          ],
        } as any
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(error, 'which must be "user" or "project"')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/config/delete', async t => {
  const context = getContext(t)
  let okCalled = false
  let configDeleteCalled = false

  // Mock server config
  ;(context.server as any).config = {
    deleteMany: async (
      keys: string[],
      which?: 'user' | 'project',
    ) => {
      configDeleteCalled = true
      t.same(keys, ['registry'])
      t.equal(which, 'project')
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project', pairs: [{ key: 'registry' }] }
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, 'Config values deleted successfully')
        okCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
  t.equal(configDeleteCalled, true)
})

t.test('/config/delete key not string', async t => {
  const context = getContext(t)
  let errorCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project', pairs: [{ key: 123 }] as any }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(error, 'All keys must be strings')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/config/delete empty keys', async t => {
  const context = getContext(t)
  let errorCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project', pairs: [] }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(
          error,
          'Config delete requires a non-empty keys array',
        )
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/config/delete throws', async t => {
  const context = getContext(t)
  let errorCalled = false

  ;(context.server as any).config = {
    deleteMany: async () => {
      throw new Error('Delete operation failed')
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { which: 'project', pairs: [{ key: 'registry' }] }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Config delete failed')
        t.equal(error, 'Delete operation failed')
        t.equal(code, 500)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/config/delete error handling', async t => {
  const context = getContext(t)
  let errorCalled = false

  // Mock server config
  ;(context.server as any).config = {
    deleteMany: async (_keys: string[]) => {
      throw new Error('Delete operation failed')
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        // Cause failure by omitting which so the handler hits the which validation
        return { pairs: [{ key: 'registry' }] } as any
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(error, 'which must be "user" or "project"')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })
  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})
