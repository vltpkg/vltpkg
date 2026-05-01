import t from 'tap'
import { setupEnv } from './fixtures/util.ts'

setupEnv(t)

t.test('isDoNotTrack', async t => {
  t.test('returns false by default', async t => {
    const { isDoNotTrack } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: () => {},
        flush: async () => {},
        getClient: () => undefined,
      },
    })
    t.equal(isDoNotTrack(), false)
  })

  t.test('returns true when DO_NOT_TRACK=1', async t => {
    process.env.DO_NOT_TRACK = '1'
    const { isDoNotTrack } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: () => {},
        flush: async () => {},
        getClient: () => undefined,
      },
    })
    t.equal(isDoNotTrack(), true)
  })

  t.test('returns true when DO_NOT_TRACK=true', async t => {
    process.env.DO_NOT_TRACK = 'true'
    const { isDoNotTrack } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: () => {},
        flush: async () => {},
        getClient: () => undefined,
      },
    })
    t.equal(isDoNotTrack(), true)
  })

  t.test(
    'returns false when DO_NOT_TRACK is something else',
    async t => {
      process.env.DO_NOT_TRACK = '0'
      const { isDoNotTrack } = await t.mockImport<
        typeof import('../src/telemetry.ts')
      >('../src/telemetry.ts', {
        '@sentry/node': {
          init: () => {},
          flush: async () => {},
          getClient: () => undefined,
        },
      })
      t.equal(isDoNotTrack(), false)
    },
  )
})

t.test('initTelemetry', async t => {
  t.test('initializes Sentry when no opt-out', async t => {
    let initCalled = false
    let initOpts: Record<string, unknown> = {}
    const { initTelemetry } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: (opts: Record<string, unknown>) => {
          initCalled = true
          initOpts = opts
        },
        flush: async () => {},
        getClient: () => undefined,
      },
    })
    initTelemetry('1.0.0')
    t.equal(initCalled, true)
    t.equal(initOpts.release, 'vlt@1.0.0')
    t.equal(initOpts.sendDefaultPii, true)
    t.type(initOpts.dsn, 'string')
  })

  t.test(
    'does not initialize Sentry when DO_NOT_TRACK=1',
    async t => {
      process.env.DO_NOT_TRACK = '1'
      let initCalled = false
      const { initTelemetry } = await t.mockImport<
        typeof import('../src/telemetry.ts')
      >('../src/telemetry.ts', {
        '@sentry/node': {
          init: () => {
            initCalled = true
          },
          flush: async () => {},
          getClient: () => undefined,
        },
      })
      initTelemetry('1.0.0')
      t.equal(initCalled, false)
    },
  )

  t.test('only initializes once', async t => {
    let initCount = 0
    const { initTelemetry } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: () => {
          initCount++
        },
        flush: async () => {},
        getClient: () => undefined,
      },
    })
    initTelemetry('1.0.0')
    initTelemetry('1.0.0')
    t.equal(initCount, 1)
  })

  t.test('works without version', async t => {
    let initOpts: Record<string, unknown> = {}
    const { initTelemetry } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: (opts: Record<string, unknown>) => {
          initOpts = opts
        },
        flush: async () => {},
        getClient: () => undefined,
      },
    })
    initTelemetry()
    t.equal(initOpts.release, undefined)
  })
})

t.test('disableTelemetry', async t => {
  t.test('closes the Sentry client', async t => {
    let closeCalled = false
    const { initTelemetry, disableTelemetry } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: () => {},
        flush: async () => {},
        getClient: () => ({
          close: (timeout: number) => {
            closeCalled = true
            t.equal(timeout, 0)
            return Promise.resolve()
          },
        }),
      },
    })
    initTelemetry('1.0.0')
    disableTelemetry()
    t.equal(closeCalled, true)
  })

  t.test('does nothing when no client', async t => {
    const { initTelemetry, disableTelemetry } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: () => {},
        flush: async () => {},
        getClient: () => undefined,
      },
    })
    initTelemetry('1.0.0')
    // should not throw
    disableTelemetry()
  })
})

t.test('flushTelemetry', async t => {
  t.test('flushes Sentry events', async t => {
    let flushTimeout = 0
    const { initTelemetry, flushTelemetry } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: () => {},
        flush: async (timeout: number) => {
          flushTimeout = timeout
        },
        getClient: () => undefined,
      },
    })
    initTelemetry('1.0.0')
    await flushTelemetry()
    t.equal(flushTimeout, 2000)
  })

  t.test('uses custom timeout', async t => {
    let flushTimeout = 0
    const { initTelemetry, flushTelemetry } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: () => {},
        flush: async (timeout: number) => {
          flushTimeout = timeout
        },
        getClient: () => undefined,
      },
    })
    initTelemetry('1.0.0')
    await flushTelemetry(5000)
    t.equal(flushTimeout, 5000)
  })

  t.test('does nothing when not initialized', async t => {
    let flushCalled = false
    process.env.DO_NOT_TRACK = '1'
    const { initTelemetry, flushTelemetry } = await t.mockImport<
      typeof import('../src/telemetry.ts')
    >('../src/telemetry.ts', {
      '@sentry/node': {
        init: () => {},
        flush: async () => {
          flushCalled = true
        },
        getClient: () => undefined,
      },
    })
    initTelemetry('1.0.0')
    await flushTelemetry()
    t.equal(flushCalled, false)
  })
})
