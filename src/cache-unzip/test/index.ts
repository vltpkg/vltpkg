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
    typeof import('../src/index.js')
  >('../src/index.js', {
    child_process: {
      spawn: (
        cmd: string,
        args: string[],
        opts: Record<string, any>,
      ) => {
        t.equal(cmd, process.execPath)
        t.equal(args.length, 4)
        t.match(args[0], /unzip\.js$/)
        t.equal(args[1], t.testdirName)
        t.strictSame(opts, {
          detached: true,
          stdio: 'ignore',
        })
        return {
          unref: () => {
            unrefCalled = true
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
  beHooks[0]!()
  t.equal(unrefCalled, true)
})
