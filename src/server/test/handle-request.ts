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
