import t from 'tap'
import type { Test } from 'tap'

t.test('registering the beforeExit event', async t => {
  const beHooks: (() => void)[] = []
  t.capture(process, 'on', (ev: string, ...args: any[]) => {
    t.equal(ev, 'beforeExit')
    t.equal(args.length, 1)
    t.match(args[0], Function)
    beHooks.push(args[0])
  })
  let unrefCalled = false
  const { register } = await t.mockImport<
    typeof import('../src/cache-revalidate.ts')
  >('../src/cache-revalidate.ts', {
    child_process: {
      spawn: (
        cmd: string,
        args: string[],
        opts: Record<string, any>,
      ) => {
        t.equal(cmd, process.execPath)
        t.equal(args.length, 2)
        t.match(args[0], /revalidate\.ts$/)
        t.equal(args[1], t.testdirName)
        t.strictSame(opts, {
          detached: true,
          stdio: ['pipe', 'ignore', 'ignore'],
          env: { ...process.env },
        })
        const written: string[] = []
        return {
          stdin: {
            write: (arg: string) => {
              written.push(arg)
            },
            end: () => {},
          },
          unref: () => {
            unrefCalled = true
            t.strictSame(written, [
              'GET https://example.com/\x00',
              'HEAD https://example.com/2\x00',
              'GET https://example.com/3\x00',
            ])
          },
        }
      },
    },
  })

  register(t.testdirName, 'GET', 'https://example.com/')
  register(t.testdirName, 'HEAD', 'https://example.com/2')
  register(t.testdirName, 'GET', 'https://example.com/3')
  t.equal(beHooks.length, 1)
  t.type(beHooks[0], 'function')
  beHooks[0]?.()
  t.equal(unrefCalled, true)
})

const mockRevalidate = async (
  t: Test,
  mocks: Record<string, any>,
) => {
  const beHooks: (() => void)[] = []
  t.capture(process, 'on', (_ev: string, fn: () => void) => {
    beHooks.push(fn)
  })
  const state = { opts: {} as Record<string, any> }
  const { register } = await t.mockImport<
    typeof import('../src/cache-revalidate.ts')
  >('../src/cache-revalidate.ts', {
    ...mocks,
    child_process: {
      spawn: (
        _cmd: string,
        _args: string[],
        opts: Record<string, any>,
      ) => {
        state.opts = opts
        return {
          stdin: { write: () => {}, end: () => {} },
          unref: () => {},
        }
      },
    },
  })
  return {
    register,
    beforeExit: () => beHooks[0]?.(),
    state,
  }
}

t.test('shares the compile cache dir with the worker', async t => {
  const { register, beforeExit, state } = await mockRevalidate(t, {
    'node:module': {
      default: { getCompileCacheDir: () => '/compile/cache' },
    },
  })

  register(t.testdirName, 'GET', 'https://example.com/')
  beforeExit()

  t.equal(state.opts.env.NODE_COMPILE_CACHE, '/compile/cache')
})

t.test('does not clobber an explicit NODE_COMPILE_CACHE', async t => {
  t.intercept(process, 'env', {
    value: { ...process.env, NODE_COMPILE_CACHE: '/explicit' },
  })

  const { register, beforeExit, state } = await mockRevalidate(t, {
    'node:module': {
      default: { getCompileCacheDir: () => '/compile/cache' },
    },
  })

  register(t.testdirName, 'GET', 'https://example.com/')
  beforeExit()

  t.equal(state.opts.env.NODE_COMPILE_CACHE, '/explicit')
})
