import t from 'tap'

t.intercept(process.stdout, 'isTTY', { value: false })
t.intercept(process.stderr, 'isTTY', { value: false })
t.intercept(process, 'env', {
  value: Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !['FORCE_COLOR', 'NO_COLOR'].includes(k),
    ),
  ),
})

import type { Jack } from 'jackspeak'
import type { LoadedConfig } from '../src/config/index.ts'
import type { Command } from '../src/index.ts'
import type { ViewFn, ViewOptions } from '../src/view.ts'
import * as view from '../src/view.ts'
import * as printErr from '../src/print-err.ts'

// make sure these are loaded after the isTTY intercept
const { outputCommand, getView, stderr, stdout } = await t.mockImport<
  typeof import('../src/output.ts')
>('../src/output.ts', {
  '../src/print-err.ts': t.createMock(printErr, {
    printErr(err: unknown) {
      errsPrinted.push(err)
    },
  }),
  '../src/view.ts': view,
})

const errsPrinted: unknown[] = []

t.test('stdout, stderr', t => {
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  stdout('standard', 'out')
  stderr('std', 'err')
  t.strictSame(logs(), [['standard', 'out']])
  t.strictSame(errs(), [['std', 'err']])
  t.end()
})

t.test('getView', async t => {
  const json = (x: unknown) => x
  const human = (x: unknown) => x
  const x = {}
  const options = {} as ViewOptions
  const confJson = {
    values: { view: 'json' },
  } as LoadedConfig
  const confHuman = {
    values: { view: 'human' },
  } as LoadedConfig
  t.equal(getView(confJson, { json, human }), json)
  const id = getView(confHuman) as ViewFn
  const xx = id(x, options, confHuman)
  t.equal(xx, x, 'identity function returned')

  const confGui = {
    values: { view: 'gui' },
  } as LoadedConfig
  process.env.VLT_VIEW = 'gui'
  const gui = getView(confGui, { json, human })
  t.equal(gui, json, 'json view was returned for unknown view name')
  t.equal(process.env.VLT_VIEW, 'json', 'set view config to default')
  const viewFn = (() => {}) as ViewFn<true>
  t.equal(getView(confHuman, viewFn), viewFn)
  t.end()
})

t.test('outputCommand', async t => {
  const confJson = {
    values: { view: 'json' },
  } as LoadedConfig
  const confHuman = {
    values: { view: 'human' },
  } as LoadedConfig
  const confInspect = {
    values: { view: 'inspect' },
  } as LoadedConfig
  const confHelp = {
    values: { help: true },
  } as LoadedConfig

  const cliCommand: Command<true> = {
    async command() {
      return true
    },
    usage: () => ({ usage: () => 'usage' }) as Jack,
    views: {
      json: x => x,
      human: x => ({ ohthehumanity: x }),
    },
  }

  t.test('output usage', async t => {
    const logs = t.capture(console, 'log').args
    await outputCommand(cliCommand, confHelp)
    t.strictSame(logs(), [['usage']])
  })

  t.test('success output (json)', async t => {
    const logs = t.capture(console, 'log').args
    await outputCommand(cliCommand, confJson)
    t.strictSame(logs(), [['true']])
  })

  t.test('success output (human)', async t => {
    const logs = t.capture(console, 'log').args
    await outputCommand(cliCommand, confHuman)
    t.strictSame(logs(), [['{ ohthehumanity: true }']])
  })

  t.test('undefined output', async t => {
    const logs = t.capture(console, 'log').args
    await outputCommand(
      {
        async command() {
          return undefined
        },
        usage: () => ({ usage: () => 'usage' }) as Jack,
        views: {
          human: x => ({ ohthehumanity: x }),
        },
      },
      confHuman,
    )
    t.strictSame(logs(), [])
  })

  t.test('missing view', async t => {
    const logs = t.capture(console, 'log').args
    await outputCommand(
      {
        async command() {
          return true
        },
        usage: () => ({ usage: () => 'usage' }) as Jack,
        views: {},
      },
      { values: {} } as LoadedConfig,
    )
    t.strictSame(logs(), [['true']])
  })

  t.test('fail output', async t => {
    errsPrinted.length = 0
    const { exitCode = 0 } = process
    const exits = t.capture(process, 'exit').args
    t.teardown(() => {
      if (t.passing()) process.exitCode = exitCode
    })
    cliCommand.command = async () => {
      throw new Error('poop')
    }
    await outputCommand(cliCommand, confInspect)
    t.strictSame(exits(), [[1]])
    t.equal(process.exitCode, 1)
    t.strictSame(errsPrinted, [new Error('poop')])
  })

  t.test('fail output with onError method', async t => {
    errsPrinted.length = 0
    const { exitCode = 0 } = process
    t.teardown(() => {
      if (t.passing()) process.exitCode = exitCode
    })
    const exits = t.capture(process, 'exit').args
    let sawError: unknown = undefined
    cliCommand.views = class extends view.ViewClass<true> {
      error(err: unknown) {
        sawError = err
      }
    }
    cliCommand.command = async () => {
      throw new Error('asdf')
    }
    await outputCommand(cliCommand, confHuman)
    t.strictSame(exits(), [[1]])
    t.equal(process.exitCode, 1)
    t.match(sawError, new Error('asdf'))
    t.equal(errsPrinted[0], sawError, 'printed the error we saw')
  })

  t.test('view class success', async t => {
    let startCalled = false
    let doneCalled = false
    let errCalled: unknown = false

    class MyView extends view.ViewClass<true> {
      start() {
        startCalled = true
      }
      done(result: true, opts: { time: number }): undefined {
        doneCalled = result
        t.matchOnlyStrict(opts, { time: Number })
      }
      error(err: unknown) {
        errCalled = err
      }
    }

    const cliCommand: Command<true> = {
      async command() {
        return true
      },
      usage: () => ({ usage: () => 'usage' }) as Jack,
      views: {
        human: MyView,
      },
    }

    await outputCommand(cliCommand, confHuman)

    t.ok(startCalled, 'start method was called')
    t.ok(doneCalled, 'done method was called')
    t.notOk(errCalled, 'error method was not called')
  })
})
