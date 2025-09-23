import * as realFs from 'node:fs'
import * as realOs from 'node:os'
import { resolve } from 'node:path'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import * as GRAPH from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'
import t from 'tap'

import type { IncomingMessage, ServerResponse } from 'http'
import type { Test } from 'tap'
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

  updateOptions(opts: any) {
    this.log.push(['updateOptions', opts])
    this.options = { ...this.options, ...opts }
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

t.test(
  '/graph/node/resolved-path depId not string (400)',
  async t => {
    const context = getContext(t)
    let errorCalled = false

    const { handleRequest } = await t.mockImport<
      typeof import('../src/handle-request.ts')
    >('../src/handle-request.ts', {
      '../src/json.ts': {
        read: async (req: IncomingMessage) => {
          t.equal(req, context.req)
          return { depId: 123 } as any
        },
        error: (
          res: ServerResponse,
          errType: string,
          error: string,
          code: number,
        ) => {
          t.equal(res, context.res)
          t.equal(errType, 'Bad request')
          t.equal(error, 'depId must be a string')
          t.equal(code, 400)
          errorCalled = true
        },
      },
    })

    await handleRequest(context.req, context.res, context.server)
    t.equal(errorCalled, true)
  },
)

t.test('/graph/node/resolved-path node not found (404)', async t => {
  const context = getContext(t)
  let errorCalled = false
  const depid = joinDepIDTuple(['file', '.'])

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { depId: depid }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Not Found')
        t.equal(error, 'Node not found for provided depId')
        t.equal(code, 404)
        errorCalled = true
      },
    },
    '../src/graph-data.ts': {
      loadGraph: () => ({ nodes: { get: () => undefined } }),
      getProjectData: () => ({
        root: '',
        tools: [],
        vltInstalled: true,
      }),
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/graph/node/resolved-path success', async t => {
  const context = getContext(t)
  let okCalled = false
  const depid = joinDepIDTuple(['file', '.'])

  ;(context.server as any).options.scurry = { s: true }

  const node = {
    resolvedLocation: (scurry: unknown) => {
      t.same(scurry, (context.server as any).options.scurry)
      return '/resolved/path'
    },
  }

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { depId: depid }
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, JSON.stringify({ path: '/resolved/path' }))
        okCalled = true
      },
    },
    '../src/graph-data.ts': {
      loadGraph: () => ({ nodes: { get: () => node } }),
      getProjectData: () => ({
        root: '',
        tools: [],
        vltInstalled: true,
      }),
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
})

t.test('/graph/node/resolved-path error (500)', async t => {
  const context = getContext(t)
  let errorCalled = false
  const depid = joinDepIDTuple(['file', '.'])

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { depId: depid }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Unable to resolve path')
        t.equal(error, 'kaput')
        t.equal(code, 500)
        errorCalled = true
      },
    },
    '../src/graph-data.ts': {
      loadGraph: () => {
        throw new Error('kaput')
      },
      getProjectData: () => ({
        root: '',
        tools: [],
        vltInstalled: true,
      }),
    },
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

t.test(
  '/config/delete reloads loadedConfig and updates options',
  async t => {
    const context = getContext(t)
    let okCalled = false
    let reloaded = false

    // provide loadedConfig so the handler exercises reload/updateOptions path
    ;(context.server as any).options.loadedConfig = {
      async reloadFromDisk() {
        reloaded = true
      },
      options: { some: 'option', 'dashboard-root': ['from-loaded'] },
    }

    // server.config.deleteMany should be called successfully
    ;(context.server as any).config = {
      async deleteMany(
        _keys: string[],
        _which?: 'user' | 'project',
      ) {},
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
    t.equal(reloaded, true)
    const updates = ms.log.filter(([k]) => k === 'updateOptions')
    t.ok(updates.length >= 1, 'updateOptions was called')
  },
)

t.test(
  '/config/set updates dashboard-root from JSON array',
  async t => {
    const context = getContext(t)
    let okCalled = false

    // ensure no stale loadedConfig from prior tests interferes
    delete (context.server as any).options.loadedConfig

    // mock config writes and canonical reads
    ;(context.server as any).config = {
      async setPairs() {},
      async get(key?: string, _which?: 'user' | 'project') {
        if (key === 'dashboard-root') {
          // return canonical value as would be read from config after write
          return ['a', 'b']
        }
        return undefined
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
                key: 'dashboard-root',
                value: JSON.stringify(['a', 'b']),
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
    // ensure updateOptions was invoked with updated dashboard-root
    const updates = ms.log.filter(([k]) => k === 'updateOptions')
    t.ok(updates.length >= 1, 'updateOptions was called')
    const last = updates[updates.length - 1]
    t.same((last?.[1] as any)['dashboard-root'], ['a', 'b'])
  },
)

t.test(
  '/config/set reloads loadedConfig and updates options',
  async t => {
    const context = getContext(t)
    let okCalled = false
    let reloaded = false

    ;(context.server as any).options.loadedConfig = {
      async reloadFromDisk() {
        reloaded = true
      },
      options: { some: 'set-opt', 'dashboard-root': ['from-loaded'] },
    }
    ;(context.server as any).config = {
      async setPairs() {},
      async get(key?: string, _which?: 'user' | 'project') {
        if (key === 'dashboard-root') {
          return ['set-project']
        }
        return undefined
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
              { key: 'registry', value: 'https://example.test/' },
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
    t.equal(reloaded, true)
    const updates = ms.log.filter(([k]) => k === 'updateOptions')
    t.ok(updates.length >= 1, 'updateOptions was called')
    const last = updates[updates.length - 1]
    t.same((last?.[1] as any)['dashboard-root'], ['set-project'])
  },
)

t.test(
  '/config/set uses user dashboard-root when project missing',
  async t => {
    const context = getContext(t)
    let okCalled = false

    delete (context.server as any).options.loadedConfig
    ;(context.server as any).config = {
      async setPairs() {},
      async get(key?: string, _which?: 'user' | 'project') {
        if (key === 'dashboard-root' && _which === 'user')
          return ['u1', 'u2']
        if (key === 'dashboard-root' && _which === 'project')
          return undefined
        return undefined
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
            pairs: [{ key: 'registry', value: 'x' }],
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
    const updates = ms.log.filter(([k]) => k === 'updateOptions')
    t.ok(updates.length >= 1, 'updateOptions was called')
    const last = updates[updates.length - 1]
    t.same((last?.[1] as any)['dashboard-root'], ['u1', 'u2'])
  },
)

t.test(
  '/config/set removes dashboard-root when not present in config',
  async t => {
    const context = getContext(t)
    let okCalled = false

    // start with a stale in-memory dashboard-root
    ;(context.server as any).options['dashboard-root'] = ['stale']
    ;(context.server as any).config = {
      async setPairs() {},
      async get() {
        return undefined
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
            pairs: [{ key: 'registry', value: 'x' }],
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
    const updates = ms.log.filter(([k]) => k === 'updateOptions')
    t.ok(updates.length >= 1, 'updateOptions was called')
    const last = updates[updates.length - 1]
    t.equal((last?.[1] as any)['dashboard-root'], undefined)
  },
)

t.test(
  '/config/delete uses project dashboard-root if present',
  async t => {
    const context = getContext(t)
    let okCalled = false

    ;(context.server as any).config = {
      async deleteMany() {},
      async get(key?: string, _which?: 'user' | 'project') {
        if (key === 'dashboard-root' && _which === 'project')
          return ['p1']
        return undefined
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
    const updates = ms.log.filter(([k]) => k === 'updateOptions')
    t.ok(updates.length >= 1, 'updateOptions was called')
    const last = updates[updates.length - 1]
    t.same((last?.[1] as any)['dashboard-root'], ['p1'])
  },
)

t.test(
  '/config/delete uses user dashboard-root when project missing',
  async t => {
    const context = getContext(t)
    let okCalled = false

    ;(context.server as any).config = {
      async deleteMany() {},
      async get(key?: string, _which?: 'user' | 'project') {
        if (key === 'dashboard-root' && _which === 'project')
          return undefined
        if (key === 'dashboard-root' && _which === 'user')
          return ['u-only']
        return undefined
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
    const updates = ms.log.filter(([k]) => k === 'updateOptions')
    t.ok(updates.length >= 1, 'updateOptions was called')
    const last = updates[updates.length - 1]
    t.same((last?.[1] as any)['dashboard-root'], ['u-only'])
  },
)

t.test(
  '/config/delete removes dashboard-root when not present in config',
  async t => {
    const context = getContext(t)
    let okCalled = false

    // start with stale in-memory value
    ;(context.server as any).options['dashboard-root'] = ['stale']
    ;(context.server as any).config = {
      async deleteMany() {},
      async get() {
        return undefined
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
    const updates = ms.log.filter(([k]) => k === 'updateOptions')
    t.ok(updates.length >= 1, 'updateOptions was called')
    const last = updates[updates.length - 1]
    t.equal((last?.[1] as any)['dashboard-root'], undefined)
  },
)

t.test('/fs/homedir', async t => {
  const context = getContext(t)
  let okCalled = false
  const home = t.testdir({})

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => home },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {}
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        t.equal(data, JSON.stringify(home))
        okCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
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

t.test('/fs/ls edge cases: other type and null fileType', async t => {
  const context = getContext(t)
  let okCalled = false

  const root = t.testdir({})

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    'node:path': {
      ...(await import('node:path')),
      // Return a value whose slice() returns undefined, exercising ?? null
      extname: () =>
        ({ slice: () => undefined }) as unknown as string,
      join: (...parts: string[]) => resolve(...parts),
    },
    'node:fs': {
      ...realFs,
      realpathSync: (p: string) => p,
      statSync: (p: string) => ({
        isDirectory: () =>
          p.replace(/\\/g, '/') === root.replace(/\\/g, '/'),
        isFile: () =>
          p.replace(/\\/g, '/') !== root.replace(/\\/g, '/') &&
          !p.endsWith('/sock'),
        size: 0,
        mtime: new Date(),
      }),
      readdirSync: () => [
        {
          name: 'sock',
          isDirectory: () => false,
          isFile: () => false,
          isSymbolicLink: () => false,
        },
        {
          name: 'nofileext',
          isDirectory: () => false,
          isFile: () => true,
          isSymbolicLink: () => false,
        },
      ],
    },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {}
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        const list = JSON.parse(data) as {
          name: string
          type: string
          fileType: string | null
        }[]
        const byName = Object.fromEntries(
          list.map(e => [e.name, e]),
        ) as Record<string, (typeof list)[number]>
        t.same(byName.sock?.type, 'other')
        t.same(byName.sock?.fileType, null)
        t.same(byName.nofileext?.type, 'file')
        t.same(byName.nofileext?.fileType, null)
        okCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
})

t.test('/fs/ls includes symlink entries', async t => {
  const context = getContext(t)
  let okCalled = false

  const root = t.testdir({})

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    'node:path': {
      ...(await import('node:path')),
      join: (...parts: string[]) => resolve(...parts),
    },
    'node:fs': {
      ...realFs,
      realpathSync: (p: string) => p,
      statSync: (p: string) => {
        const normalized = p.replace(/\\/g, '/')
        return {
          isDirectory: () => normalized === root.replace(/\\/g, '/'),
          isFile: () => normalized.endsWith('/link'),
          size: 3,
          mtime: new Date(),
        }
      },
      readdirSync: () => [
        {
          name: 'link',
          isDirectory: () => false,
          isFile: () => false,
          isSymbolicLink: () => true,
        },
      ],
    },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {}
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        const list = JSON.parse(data) as {
          name: string
          path: string
          type: string
          fileType: string | null
          size: number | null
          mtime: string | null
        }[]
        t.ok(Array.isArray(list))
        const item = list.find(e => e.name === 'link')
        t.ok(item)
        t.equal(item?.type, 'symlink')
        t.equal(item?.fileType, null)
        t.equal(item?.size, 3)
        t.equal(item?.path, resolve(root, 'link'))
        t.type(item?.mtime, 'string')
        okCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
})

t.test('/fs/ls success (root listing)', async t => {
  const context = getContext(t)
  let okCalled = false

  const root = t.testdir({
    a: {},
    'b.txt': 'hello',
    c: 'x',
  })

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {}
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        const list = JSON.parse(data) as {
          name: string
          path: string
          type: string
          fileType: string | null
          size: number | null
          mtime: string | null
        }[]
        t.ok(Array.isArray(list))
        const byName = Object.fromEntries(
          list.map(e => [e.name, e]),
        ) as Record<string, (typeof list)[number]>
        t.ok(byName.a)
        t.equal(byName.a?.type, 'directory')
        t.equal(byName.a?.fileType, null)
        t.type(byName.a?.size, 'number')
        t.equal(byName.a?.path, resolve(root, 'a'))
        t.type(byName.a?.mtime, 'string')

        t.ok(byName['b.txt'])
        t.equal(byName['b.txt']?.type, 'file')
        t.equal(byName['b.txt']?.fileType, 'txt')
        t.equal(byName['b.txt']?.size, 5)
        t.equal(byName['b.txt']?.path, resolve(root, 'b.txt'))
        t.type(byName['b.txt']?.mtime, 'string')

        t.ok(byName.c)
        t.equal(byName.c?.type, 'file')
        t.equal(byName.c?.fileType, null)
        t.equal(byName.c?.size, 1)
        t.equal(byName.c?.path, resolve(root, 'c'))
        t.type(byName.c?.mtime, 'string')
        okCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
})

t.test('/fs/read success utf8', async t => {
  const context = getContext(t)
  let okCalled = false

  const root = t.testdir({ 'file.txt': 'hello' })

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'file.txt', encoding: 'utf8' }
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        const out = JSON.parse(data) as {
          content: string
          encoding: 'utf8' | 'base64'
          mime: string
          ext: string | null
          name: string
        }
        t.strictSame(out, {
          content: 'hello',
          encoding: 'utf8',
          mime: 'text/plain',
          ext: 'txt',
          name: 'file.txt',
        })
        okCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
})

t.test('/fs/read success base64', async t => {
  const context = getContext(t)
  let okCalled = false

  const root = t.testdir({
    'img.bin': Buffer.from([1, 2, 3]).toString('binary'),
  })
  const expected = Buffer.from([1, 2, 3]).toString('base64')

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'img.bin', encoding: 'base64' }
      },
      ok: (res: ServerResponse, data: string) => {
        t.equal(res, context.res)
        const out = JSON.parse(data) as {
          content: string
          encoding: 'utf8' | 'base64'
          mime: string
          ext: string | null
          name: string
        }
        t.equal(out.content, expected)
        t.equal(out.encoding, 'base64')
        t.equal(out.ext, 'bin')
        t.equal(out.name, 'img.bin')
        t.equal(out.mime, 'application/octet-stream')
        okCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(okCalled, true)
})

t.test('/fs/read path not a string (400)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({})

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 123 } as any
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(error, 'path must be a string')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/fs/read path traversal forbidden (403)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({})

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: '..' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Forbidden')
        t.equal(error, 'Path traversal detected')
        t.equal(code, 403)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/fs/read path is a directory (400)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({ a: {} })

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'a' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(error, 'Path must be a file')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/fs/read ENOENT (404)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({})

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'missing.txt' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Not Found')
        t.equal(error, 'File does not exist')
        t.equal(code, 404)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/fs/read EACCES (403 Permission denied)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({ 'file.txt': 'hello' })

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    'node:fs': {
      ...realFs,
      realpathSync: (p: string) => p,
      statSync: (p: string) => {
        if (p === resolve(root, 'file.txt')) {
          return {
            isDirectory: () => false,
            isFile: () => true,
          }
        }
        return realFs.statSync(p)
      },
      readFileSync: (p: string, ...rest: any[]) => {
        if (p === resolve(root, 'file.txt')) {
          const e: any = new Error('Permission denied')
          e.code = 'EACCES'
          throw e
        }
        const pass = realFs.readFileSync as unknown as (
          ...args: any[]
        ) => any
        return pass(p, ...rest)
      },
    },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'file.txt' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Forbidden')
        t.equal(error, 'Permission denied')
        t.equal(code, 403)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/fs/read generic server error (500)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({ 'file.txt': 'hello' })

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    'node:fs': {
      ...realFs,
      realpathSync: (p: string) => p,
      statSync: (p: string) => {
        if (p === resolve(root, 'file.txt')) {
          return {
            isDirectory: () => false,
            isFile: () => true,
          }
        }
        return realFs.statSync(p)
      },
      readFileSync: (p: string, ...rest: any[]) => {
        if (p === resolve(root, 'file.txt')) {
          throw new Error('kaboom')
        }
        const pass = realFs.readFileSync as unknown as (
          ...args: any[]
        ) => any
        return pass(p, ...rest)
      },
    },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'file.txt' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Server error')
        t.equal(error, 'kaboom')
        t.equal(code, 500)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test(
  '/fs/read no extension yields null ext and octet-stream mime',
  async t => {
    const context = getContext(t)
    let okCalled = false

    const root = t.testdir({ noext: 'abc' })

    const { handleRequest } = await t.mockImport<
      typeof import('../src/handle-request.ts')
    >('../src/handle-request.ts', {
      'node:os': {
        ...realOs,
        homedir: () => root,
        tmpdir: () => root,
      },
      '../src/json.ts': {
        read: async (req: IncomingMessage) => {
          t.equal(req, context.req)
          return { path: 'noext' }
        },
        ok: (res: ServerResponse, data: string) => {
          t.equal(res, context.res)
          const out = JSON.parse(data) as {
            content: string
            encoding: 'utf8' | 'base64'
            mime: string
            ext: string | null
            name: string
          }
          t.equal(out.content, 'abc')
          t.equal(out.encoding, 'utf8')
          t.equal(out.mime, 'application/octet-stream')
          t.equal(out.ext, null)
          t.equal(out.name, 'noext')
          okCalled = true
        },
      },
    })

    await handleRequest(context.req, context.res, context.server)
    t.equal(okCalled, true)
  },
)

t.test('/fs/ls path is a file (400)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({
    'b.txt': 'hello',
  })

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'b.txt' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Bad request')
        t.equal(error, 'Path must be a directory')
        t.equal(code, 400)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/fs/ls path traversal forbidden (403)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({ a: {} })

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: '..' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Forbidden')
        t.equal(error, 'Path traversal detected')
        t.equal(code, 403)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/fs/ls non-existent dir (404)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({})

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'does-not-exist' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Not Found')
        t.equal(error, 'Directory does not exist')
        t.equal(code, 404)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/fs/ls EACCES (403 Permission denied)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({ a: {} })

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    'node:fs': {
      ...realFs,
      // Override only what we need for this test path
      readdirSync: () => [],
      readdir: async () => [],
      mkdirSync: () => {},
      realpathSync: (p: string) => p,
      lstatSync: () => ({
        isDirectory: () => true,
        isFile: () => false,
      }),
      statSync: () => {
        const e: any = new Error('Permission denied')
        e.code = 'EACCES'
        throw e
      },
      readFileSync: realFs.readFileSync,
      writeFileSync: realFs.writeFileSync,
    },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'a' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Forbidden')
        t.equal(error, 'Permission denied')
        t.equal(code, 403)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test('/fs/ls generic server error (500)', async t => {
  const context = getContext(t)
  let errorCalled = false

  const root = t.testdir({ a: {} })

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    'node:os': { ...realOs, homedir: () => root, tmpdir: () => root },
    'node:fs': {
      ...realFs,
      readdirSync: () => [],
      readdir: async () => [],
      mkdirSync: () => {},
      realpathSync: (p: string) => p,
      lstatSync: () => ({
        isDirectory: () => true,
        isFile: () => false,
      }),
      statSync: () => {
        throw new Error('kaboom')
      },
      readFileSync: realFs.readFileSync,
      writeFileSync: realFs.writeFileSync,
    },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return { path: 'a' }
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(errType, 'Server error')
        t.equal(error, 'kaboom')
        t.equal(code, 500)
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})

t.test(
  '/host-contexts returns array of TransferData for local context',
  async t => {
    const context = getContext(t)
    let responseData = ''
    let statusCode = 0

    // Mock the response object to capture direct writes
    context.res = {
      writeHead: (code: number) => {
        statusCode = code
      },
      end: (data: string) => {
        responseData = data
      },
    } as unknown as ServerResponse

    const { handleRequest } = await t.mockImport<
      typeof import('../src/handle-request.ts')
    >('../src/handle-request.ts', {
      '../src/read-project-folders.ts': {
        readProjectFolders: async () => [
          { fullpath: () => '/test/project1' },
          { fullpath: () => '/test/project2' },
        ],
      },
      '../src/config-data.ts': {
        reloadConfig: async (projectRoot: string) => ({
          options: {
            projectRoot,
            scurry: new (await import('path-scurry')).PathScurry(
              projectRoot,
            ),
            packageJson: {
              read: () => ({
                name: projectRoot,
                version: '1.0.0',
              }),
            },
          },
        }),
      },
      '@vltpkg/graph': {
        actual: {
          load: (options: any) => ({
            nodes: { values: () => [{ id: 'mock-node' }] },
            importers: [
              {
                importer: true,
                id: 'test-importer',
                name: options.projectRoot,
                version: '1.0.0',
                location: options.projectRoot,
                manifest: {
                  name: options.projectRoot,
                  version: '1.0.0',
                },
                dev: false,
                optional: false,
              },
            ],
          }),
        },
        asDependency: (obj: any) => obj,
        install: () => {},
        uninstall: () => {},
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          async start() {
            return undefined
          },
        },
      },
      '../src/graph-data.ts': {
        loadGraph: () => ({ nodes: { get: () => undefined } }),
        getProjectData: (options: any, folder: any) => ({
          root: options.projectRoot || folder.fullpath(),
          tools: ['vlt'],
          vltInstalled: true,
        }),
      },
      '../src/json.ts': {
        read: async (req: IncomingMessage) => {
          t.equal(req, context.req)
          return {}
        },
        error: (
          _res: ServerResponse,
          _errType: string,
          _error: string,
          _code: number,
        ) => {
          t.fail('error should not be called in success case')
        },
      },
    })

    await handleRequest(context.req, context.res, context.server)

    t.equal(statusCode, 200, 'returns 200 status')
    t.ok(responseData, 'returns response data')

    const response = JSON.parse(responseData)
    t.ok(response.local, 'has local context')
    t.ok(Array.isArray(response.local), 'local is an array')
    t.equal(
      response.local.length,
      2,
      'returns data for both projects',
    )

    const firstProject = response.local[0]
    t.ok(firstProject.importers, 'has importers')
    t.ok(firstProject.lockfile, 'has lockfile')
    t.ok(firstProject.projectInfo, 'has projectInfo')
    t.equal(
      firstProject.securityArchive,
      undefined,
      'securityArchive is undefined as expected',
    )
  },
)

t.test(
  '/host-contexts handles project load failures gracefully',
  async t => {
    const context = getContext(t)
    let responseData = ''
    let statusCode = 0
    let callCount = 0

    // Mock the response object to capture direct writes
    context.res = {
      writeHead: (code: number) => {
        statusCode = code
      },
      end: (data: string) => {
        responseData = data
      },
    } as unknown as ServerResponse

    const { handleRequest } = await t.mockImport<
      typeof import('../src/handle-request.ts')
    >('../src/handle-request.ts', {
      '../src/read-project-folders.ts': {
        readProjectFolders: async () => [
          { fullpath: () => '/test/project1' },
          { fullpath: () => '/test/failing-project' },
          { fullpath: () => '/test/project3' },
        ],
      },
      '../src/config-data.ts': {
        reloadConfig: async (projectRoot: string) => {
          if (projectRoot === '/test/failing-project') {
            throw new Error('Failed to load config')
          }
          callCount++
          return {
            options: {
              projectRoot,
              scurry: new (await import('path-scurry')).PathScurry(
                projectRoot,
              ),
              packageJson: {
                read: () => ({
                  name: projectRoot,
                  version: '1.0.0',
                }),
              },
            },
          }
        },
      },
      '@vltpkg/graph': {
        actual: {
          load: () => ({
            nodes: { values: () => [] },
            importers: [],
          }),
        },
        asDependency: (obj: any) => obj,
        install: () => {},
        uninstall: () => {},
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          async start() {
            return undefined
          },
        },
      },
      '../src/graph-data.ts': {
        loadGraph: () => ({ nodes: { get: () => undefined } }),
        getProjectData: (options: any, folder: any) => ({
          root: options.projectRoot || folder.fullpath(),
          tools: ['vlt'],
          vltInstalled: true,
        }),
      },
      '../src/json.ts': {
        read: async (req: IncomingMessage) => {
          t.equal(req, context.req)
          return {}
        },
        error: (
          _res: ServerResponse,
          _errType: string,
          _error: string,
          _code: number,
        ) => {
          t.fail('error should not be called in success case')
        },
      },
    })

    await handleRequest(context.req, context.res, context.server)

    t.equal(statusCode, 200, 'returns 200 status')
    t.ok(responseData, 'returns response data')

    const response = JSON.parse(responseData)
    t.equal(response.local.length, 2, 'skips failing project')
    t.equal(
      callCount,
      2,
      'only calls getGraphData for successful projects',
    )
  },
)

t.test(
  '/host-contexts handles empty dashboard-root configuration',
  async t => {
    const context = getContext(t)
    let responseData = ''
    let statusCode = 0

    // Mock the response object to capture direct writes
    context.res = {
      writeHead: (code: number) => {
        statusCode = code
      },
      end: (data: string) => {
        responseData = data
      },
    } as unknown as ServerResponse

    const { handleRequest } = await t.mockImport<
      typeof import('../src/handle-request.ts')
    >('../src/handle-request.ts', {
      '../src/read-project-folders.ts': {
        readProjectFolders: async (options: any) => {
          t.same(
            options.userDefinedProjectPaths,
            [],
            'passes empty array when no dashboard-root',
          )
          return []
        },
      },
      '../src/config-data.ts': {
        reloadConfig: async () => ({
          options: {
            projectRoot: '/test/project',
            scurry: new (await import('path-scurry')).PathScurry(
              '/test/project',
            ),
            packageJson: {
              read: () => ({ name: 'test', version: '1.0.0' }),
            },
          },
        }),
      },
      '@vltpkg/graph': {
        actual: {
          load: () => ({
            nodes: { values: () => [] },
            importers: [],
          }),
        },
        asDependency: (obj: any) => obj,
        install: () => {},
        uninstall: () => {},
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          async start() {
            return undefined
          },
        },
      },
      '../src/graph-data.ts': {
        loadGraph: () => ({ nodes: { get: () => undefined } }),
        getProjectData: (options: any, folder: any) => ({
          root: options.projectRoot || folder.fullpath(),
          tools: [],
          vltInstalled: false,
        }),
      },
      '../src/json.ts': {
        read: async (req: IncomingMessage) => {
          t.equal(req, context.req)
          return {}
        },
        error: (
          _res: ServerResponse,
          _errType: string,
          _error: string,
          _code: number,
        ) => {
          t.fail('error should not be called in success case')
        },
      },
    })

    // Override server options to simulate empty dashboard-root
    ;(context.server as any).options = {
      ...context.server.options,
      'dashboard-root': undefined,
    }

    await handleRequest(context.req, context.res, context.server)

    t.equal(statusCode, 200, 'returns 200 status')
    t.ok(responseData, 'returns response data')

    const response = JSON.parse(responseData)
    t.same(response.local, [], 'returns empty array')
  },
)

t.test('/host-contexts handles server errors', async t => {
  const context = getContext(t)
  let errorCalled = false

  const { handleRequest } = await t.mockImport<
    typeof import('../src/handle-request.ts')
  >('../src/handle-request.ts', {
    '../src/read-project-folders.ts': {
      readProjectFolders: async () => {
        throw new Error('Failed to read project folders')
      },
    },
    '../src/json.ts': {
      read: async (req: IncomingMessage) => {
        t.equal(req, context.req)
        return {}
      },
      error: (
        res: ServerResponse,
        errType: string,
        error: string,
        code: number,
      ) => {
        t.equal(res, context.res)
        t.equal(code, 500, 'returns 500 status')
        t.ok(error, 'returns error message')
        t.match(
          errType,
          /Host contexts retrieval failed/,
          'returns correct error type',
        )
        errorCalled = true
      },
    },
  })

  await handleRequest(context.req, context.res, context.server)
  t.equal(errorCalled, true)
})
