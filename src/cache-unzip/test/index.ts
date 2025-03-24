import t from 'tap'
import type { Test } from 'tap'

const mockUnzip = async (t: Test) => {
  let beforeExitHook: (() => void) | null = null

  const state = {
    unrefCalled: false,
    cmd: '',
    args: [] as string[],
    opts: {} as Record<string, any>,
    written: [] as string[],
  }

  t.capture(process, 'on', (ev: string, fn: () => void) => {
    if (ev === 'beforeExit') {
      beforeExitHook = fn
    }
  })

  const { register } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    child_process: {
      spawn: (
        cmd: string,
        args: string[],
        opts: Record<string, any>,
      ) => {
        state.cmd = cmd
        state.args = args
        state.opts = opts
        return {
          stdin: {
            write: (arg: string) => {
              state.written.push(arg)
            },
            end: () => {},
          },
          unref: () => {
            state.unrefCalled = true
          },
        }
      },
    },
  })

  return {
    register,
    beforeExit: () => beforeExitHook?.(),
    state,
  }
}

t.test('registering the beforeExit event', async t => {
  const { register, beforeExit, state } = await mockUnzip(t)

  register(t.testdirName, 'key 1')
  register(t.testdirName, 'key 2')
  register(t.testdirName, 'key 1')
  beforeExit()

  t.equal(state.cmd, process.execPath)
  t.equal(state.args.length, 2)
  t.match(state.args[0], /[\\/]unzip\.ts$/)
  t.equal(state.args[1], t.testdirName)
  t.strictSame(state.opts, {
    detached: true,
    stdio: ['pipe', 'ignore', 'ignore'],
    env: { ...process.env },
  })

  t.equal(state.unrefCalled, true)

  t.strictSame(state.written, ['key 1\0', 'key 2\0'])
})

t.test('compiled', async t => {
  t.intercept(process, 'env', {
    value: { __VLT_INTERNAL_COMPILED: 'true' },
  })

  const { register, beforeExit, state } = await mockUnzip(t)

  register(t.testdirName, 'key 1')
  register(t.testdirName, 'key 2')
  register(t.testdirName, 'key 1')
  beforeExit()

  t.equal(state.args.length, 1)
  t.match(
    state.opts.env.__VLT_INTERNAL_MAIN,
    /^file:.*[\\/]unzip\.ts$/,
  )
  t.equal(state.unrefCalled, true)
})

t.test('deno', async t => {
  t.intercept(
    globalThis as typeof globalThis & { Deno?: any },
    'Deno',
    {
      value: {},
    },
  )

  t.intercept(process, 'platform', { value: 'linux' })

  const { register, beforeExit, state } = await mockUnzip(t)

  register(t.testdirName, 'key 1')
  beforeExit()

  t.equal(state.args.length, 4)
  t.equal(state.args[0], '--unstable-node-globals')
  t.equal(state.args[1], '--unstable-bare-node-builtins')

  t.equal(state.unrefCalled, true)
})

t.test('deno + windows', async t => {
  t.intercept(
    globalThis as typeof globalThis & { Deno?: any },
    'Deno',
    {
      value: {},
    },
  )

  t.intercept(process, 'platform', { value: 'win32' })

  const { register, beforeExit, state } = await mockUnzip(t)

  register(t.testdirName, 'key 1')
  beforeExit()

  t.equal(state.opts.detached, false, 'detached is false on windows')
  t.equal(state.unrefCalled, false, 'unref is not called on windows')
  t.strictSame(state.written, ['key 1\0'])
})
