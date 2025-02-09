import t from 'tap'

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
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    child_process: {
      spawn: (
        cmd: string,
        args: string[],
        opts: Record<string, any>,
      ) => {
        t.equal(cmd, process.execPath)
        t.equal(args.length, 2)
        t.match(args[0], /unzip\.ts$/)
        t.equal(args[1], t.testdirName)
        t.strictSame(opts, {
          detached: true,
          stdio: ['pipe', 'ignore', 'ignore'],
        })
        const written: string[] = []
        return {
          stdin: {
            write: (arg: string) => {
              written.push(arg)
            },
          },
          unref: () => {
            unrefCalled = true
            t.strictSame(written, ['key 1\0', 'key 2\0'])
          },
        }
      },
    },
  })

  register(t.testdirName, 'key 1')
  register(t.testdirName, 'key 2')
  register(t.testdirName, 'key 1')
  t.equal(beHooks.length, 1)
  t.type(beHooks[0], 'function')
  beHooks[0]?.()
  t.equal(unrefCalled, true)
})
