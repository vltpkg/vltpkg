import type { IncomingMessage, ServerResponse } from 'node:http'
import * as HTTP from 'node:http'
import { resolve } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'

let resultEnded = ''
let requestStreamed: unknown = undefined
let wroteHead: unknown = undefined
t.beforeEach(t => {
  delete process.env.__VLT_INTERNAL_LIVE_RELOAD

  resultEnded = ''
  requestStreamed = undefined
  wroteHead = undefined

  // tests named for their request path get the HTTP context
  if (!t.name.startsWith('/')) return
  const dir = t.testdir({
    public: {},
    assets: {},
  })
  t.context = {
    res: {
      writeHead: (statusCode: number, headers: any) => {
        wroteHead = [statusCode, headers]
      },
      end: (s: string) => {
        resultEnded = s
      },
    } as unknown as ServerResponse,
    // default to what we'll usually be testing, can always override
    req: {
      method: 'POST',
      url: t.name.replace(/ .*$/, ''),
      headers: { some: 'headers' },
      pipe: (dest: unknown) => {
        requestStreamed = dest
        return dest
      },
    } as unknown as IncomingMessage,
    options: {
      publicDir: resolve(dir, 'public'),
      assetsDir: resolve(dir, 'assets'),
    },
  }
})

// cast off the `any`, so we will catch type errors in methods
const getContext = (
  t: Test,
): {
  res: ServerResponse
  req: IncomingMessage
  options: {
    publicDir: string
    assetsDir: string
  }
} => t.context

t.test('/errHandler', async t => {
  const context = getContext(t)
  const { handleStatic } = await t.mockImport<
    typeof import('../src/handle-static.ts')
  >('../src/handle-static.ts', {
    'serve-handler': async () => {
      throw new Error('poop')
    },
  })
  const consoleErrors = t.capture(console, 'error').args
  await handleStatic(context.req, context.res, context.options)
  t.equal(resultEnded, 'Internal server error')
  t.equal(context.res.statusCode, 500)
  t.strictSame(consoleErrors(), [[new Error('poop')]])
})

t.test('/handle-it', async t => {
  const context = getContext(t)
  let calledServe = false
  const { handleStatic } = await t.mockImport<
    typeof import('../src/handle-static.ts')
  >('../src/handle-static.ts', {
    'serve-handler': async (
      req: IncomingMessage,
      res: ServerResponse,
      opts: unknown,
    ) => {
      calledServe = true
      t.equal(req, context.req)
      t.equal(res, context.res)
      t.strictSame(opts, {
        cleanUrls: true,
        public: context.options.publicDir,
        rewrites: [
          { source: '/', destination: '/index.html' },
          { source: '/error', destination: '/index.html' },
          { source: '/explore', destination: '/index.html' },
          { source: '/dashboard', destination: '/index.html' },
          { source: '/queries', destination: '/index.html' },
          { source: '/labels', destination: '/index.html' },
          { source: '/new-project', destination: '/index.html' },
        ],
      })
    },
  })
  await handleStatic(context.req, context.res, context.options)
  t.equal(calledServe, true)
})

t.test('/handle-it not proxied', async t => {
  process.env.__VLT_INTERNAL_LIVE_RELOAD = '1'

  const context = getContext(t)
  let calledServe = false
  const { handleStatic } = await t.mockImport<
    typeof import('../src/handle-static.ts')
  >('../src/handle-static.ts', {
    'serve-handler': async (
      req: IncomingMessage,
      res: ServerResponse,
      opts: unknown,
    ) => {
      calledServe = true
      t.equal(req, context.req)
      t.equal(res, context.res)
      t.strictSame(opts, {
        cleanUrls: true,
        public: context.options.publicDir,
        rewrites: [
          { source: '/', destination: '/index.html' },
          { source: '/error', destination: '/index.html' },
          { source: '/explore', destination: '/index.html' },
          { source: '/dashboard', destination: '/index.html' },
          { source: '/queries', destination: '/index.html' },
          { source: '/labels', destination: '/index.html' },
          { source: '/new-project', destination: '/index.html' },
        ],
      })
    },
  })
  await handleStatic(context.req, context.res, context.options)
  t.equal(calledServe, true)
})

t.test('/esbuild is proxied', async t => {
  process.env.__VLT_INTERNAL_LIVE_RELOAD = '1'

  let requestCalled = false
  const context = getContext(t)
  let calledServe = false
  const mockRequest = {
    on() {
      return this
    },
  }
  const { handleStatic } = await t.mockImport<
    typeof import('../src/handle-static.ts')
  >('../src/handle-static.ts', {
    'node:http': t.createMock(HTTP, {
      request: (options: any, proxyFn: (p: any) => any) => {
        requestCalled = true
        t.strictSame(options, {
          hostname: 'localhost',
          port: 7018,
          path: context.req.url,
          method: context.req.method,
          headers: context.req.headers,
        })
        t.type(proxyFn, 'function')
        let piped = false
        const proxy = {
          statusCode: 200,
          headers: { proxy: 'headers' },
          pipe: (dest: any, options: any) => {
            piped = true
            t.strictSame(options, { end: true })
            t.equal(dest, context.res)
          },
        }
        proxyFn(proxy)
        t.equal(piped, true)
        t.strictSame(wroteHead, [200, { proxy: 'headers' }])
        return mockRequest
      },
    }),
    'serve-handler': async (
      req: IncomingMessage,
      res: ServerResponse,
      opts: unknown,
    ) => {
      calledServe = true
      t.equal(req, context.req)
      t.equal(res, context.res)
      t.strictSame(opts, {
        cleanUrls: true,
        public: context.options.publicDir,
        rewrites: [
          { source: '/', destination: '/index.html' },
          { source: '/error', destination: '/index.html' },
          { source: '/explore', destination: '/index.html' },
          { source: '/dashboard', destination: '/index.html' },
          { source: '/queries', destination: '/index.html' },
          { source: '/labels', destination: '/index.html' },
          { source: '/new-project', destination: '/index.html' },
        ],
      })
    },
  })
  await handleStatic(context.req, context.res, context.options)
  t.equal(requestCalled, true)
  t.equal(requestStreamed, mockRequest)
  t.equal(calledServe, false)
})

t.test('/handle-it is proxied, has an error', async t => {
  process.env.__VLT_INTERNAL_LIVE_RELOAD = '1'

  t.testdir({
    public: {},
    assets: { 'handle-it': 'some file contents' },
  })
  let requestCalled = false
  const context = getContext(t)
  let calledServe = false

  let resolve!: () => void
  const p = new Promise<void>(res => (resolve = res))

  const mockRequest = {
    on(ev: 'error', fn: (err: unknown) => unknown) {
      t.equal(ev, 'error', 'should be error event')
      setTimeout(() => {
        fn(new Error('poop'))
        resolve()
      })
      return this
    },
  }

  const { handleStatic } = await t.mockImport<
    typeof import('../src/handle-static.ts')
  >('../src/handle-static.ts', {
    'node:http': t.createMock(HTTP, {
      request: (options: any, proxyFn: (p: any) => any) => {
        requestCalled = true
        t.strictSame(options, {
          hostname: 'localhost',
          port: 7018,
          path: context.req.url,
          method: context.req.method,
          headers: context.req.headers,
        })
        t.type(proxyFn, 'function')
        let piped = false
        const proxy = {
          statusCode: 200,
          headers: { proxy: 'headers' },
          pipe: (dest: any, options: any) => {
            piped = true
            t.strictSame(options, { end: true })
            t.equal(dest, context.res)
          },
        }
        proxyFn(proxy)
        t.equal(piped, true)
        t.strictSame(wroteHead, [200, { proxy: 'headers' }])
        return mockRequest
      },
    }),
    'serve-handler': async (
      req: IncomingMessage,
      res: ServerResponse,
      opts: unknown,
    ) => {
      calledServe = true
      t.equal(req, context.req)
      t.equal(res, context.res)
      t.strictSame(opts, {
        cleanUrls: true,
        public: context.options.publicDir,
        rewrites: [
          { source: '/', destination: '/index.html' },
          { source: '/error', destination: '/index.html' },
          { source: '/explore', destination: '/index.html' },
          { source: '/dashboard', destination: '/index.html' },
          { source: '/queries', destination: '/index.html' },
          { source: '/labels', destination: '/index.html' },
          { source: '/new-project', destination: '/index.html' },
        ],
      })
    },
  })
  const consoleErrors = t.capture(console, 'error').args

  await handleStatic(context.req, context.res, context.options)
  t.equal(requestCalled, true)
  t.equal(requestStreamed, mockRequest)

  await p

  t.equal(calledServe, false)
  t.strictSame(consoleErrors(), [[new Error('poop')]])
})

t.test(
  '/handle-it is proxied, has an ECONNREFUSED error',
  async t => {
    process.env.__VLT_INTERNAL_LIVE_RELOAD = '1'

    t.testdir({
      public: {},
      assets: { 'handle-it': 'some file contents' },
    })
    let requestCalled = false
    const context = getContext(t)
    let calledServe = false

    let resolve!: () => void
    const p = new Promise<void>(res => (resolve = res))

    const mockRequest = {
      on(ev: 'error', fn: (err: unknown) => unknown) {
        t.equal(ev, 'error', 'should be error event')
        setTimeout(() => {
          fn(
            Object.assign(new Error('poop'), {
              code: 'ECONNREFUSED',
            }),
          )
          resolve()
        })
        return this
      },
    }

    const { handleStatic } = await t.mockImport<
      typeof import('../src/handle-static.ts')
    >('../src/handle-static.ts', {
      'node:http': t.createMock(HTTP, {
        request: (options: any, proxyFn: (p: any) => any) => {
          requestCalled = true
          t.strictSame(options, {
            hostname: 'localhost',
            port: 7018,
            path: context.req.url,
            method: context.req.method,
            headers: context.req.headers,
          })
          t.type(proxyFn, 'function')
          let piped = false
          const proxy = {
            statusCode: 200,
            headers: { proxy: 'headers' },
            pipe: (dest: any, options: any) => {
              piped = true
              t.strictSame(options, { end: true })
              t.equal(dest, context.res)
            },
          }
          proxyFn(proxy)
          t.equal(piped, true)
          t.strictSame(wroteHead, [200, { proxy: 'headers' }])
          return mockRequest
        },
      }),
      'serve-handler': async (
        req: IncomingMessage,
        res: ServerResponse,
        opts: unknown,
      ) => {
        calledServe = true
        t.equal(req, context.req)
        t.equal(res, context.res)
        t.strictSame(opts, {
          cleanUrls: true,
          public: context.options.publicDir,
          rewrites: [
            { source: '/', destination: '/index.html' },
            { source: '/error', destination: '/index.html' },
            { source: '/explore', destination: '/index.html' },
            { source: '/dashboard', destination: '/index.html' },
            { source: '/queries', destination: '/index.html' },
            { source: '/labels', destination: '/index.html' },
            { source: '/new-project', destination: '/index.html' },
          ],
        })
      },
    })
    const consoleErrors = t.capture(console, 'error').args

    await handleStatic(context.req, context.res, context.options)
    t.equal(requestCalled, true)
    t.equal(requestStreamed, mockRequest)

    await p

    t.equal(calledServe, true)
    t.strictSame(consoleErrors(), [])
  },
)

t.test('/esbuild has an ECONNREFUSED error', async t => {
  process.env.__VLT_INTERNAL_LIVE_RELOAD = '1'

  let requestCalled = false
  const context = getContext(t)
  let calledServe = false

  let resolve!: () => void
  const p = new Promise<void>(res => (resolve = res))

  const mockRequest = {
    on(ev: 'error', fn: (err: unknown) => unknown) {
      t.equal(ev, 'error', 'should be error event')
      setTimeout(() => {
        fn(
          Object.assign(new Error('poop'), {
            code: 'ECONNREFUSED',
          }),
        )
        resolve()
      })
      return this
    },
  }

  const { handleStatic } = await t.mockImport<
    typeof import('../src/handle-static.ts')
  >('../src/handle-static.ts', {
    'node:http': t.createMock(HTTP, {
      request: (options: any, proxyFn: (p: any) => any) => {
        requestCalled = true
        t.strictSame(options, {
          hostname: 'localhost',
          port: 7018,
          path: context.req.url,
          method: context.req.method,
          headers: context.req.headers,
        })
        t.type(proxyFn, 'function')
        let piped = false
        const proxy = {
          statusCode: 200,
          headers: { proxy: 'headers' },
          pipe: (dest: any, options: any) => {
            piped = true
            t.strictSame(options, { end: true })
            t.equal(dest, context.res)
          },
        }
        proxyFn(proxy)
        t.equal(piped, true)
        t.strictSame(wroteHead, [200, { proxy: 'headers' }])
        return mockRequest
      },
    }),
    'serve-handler': async (
      req: IncomingMessage,
      res: ServerResponse,
      opts: unknown,
    ) => {
      calledServe = true
      t.equal(req, context.req)
      t.equal(res, context.res)
      t.strictSame(opts, {
        cleanUrls: true,
        public: context.options.publicDir,
        rewrites: [
          { source: '/', destination: '/index.html' },
          { source: '/error', destination: '/index.html' },
          { source: '/explore', destination: '/index.html' },
          { source: '/dashboard', destination: '/index.html' },
          { source: '/queries', destination: '/index.html' },
          { source: '/labels', destination: '/index.html' },
          { source: '/new-project', destination: '/index.html' },
        ],
      })
    },
  })
  const consoleErrors = t.capture(console, 'error').args

  await handleStatic(context.req, context.res, context.options)
  t.equal(requestCalled, true)
  t.equal(requestStreamed, mockRequest)

  await p

  t.equal(calledServe, false)
  t.strictSame(consoleErrors(), [])
  t.equal(context.res.statusCode, 404)
})
