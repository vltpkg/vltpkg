import t from 'tap'

t.intercept(process.stdout, 'isTTY', { value: false })

import type { Jack } from 'jackspeak'
import type { LoadedConfig } from '../src/config/index.ts'
import type { Command } from '../src/index.ts'
import type { ViewFn, ViewOptions, Views } from '../src/view.ts'
import { ViewClass, isViewClass } from '../src/view.ts'

// make sure these are loaded after the isTTY intercept
const { outputCommand, startView, getView, stderr, stdout } =
  await t.mockImport<typeof import('../src/output.ts')>(
    '../src/output.ts',
    {
      '../src/print-err.ts': {
        printErr(err: unknown) {
          errsPrinted.push(err)
        },
      },
      '../src/view.ts': {
        ViewClass,
        isViewClass,
      },
    },
  )

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
  const options: ViewOptions = {}
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

t.test('startView', async t => {
  const confJson = {
    values: { view: 'json', color: false },
  } as LoadedConfig
  const confHuman = {
    values: { view: 'human', color: true },
  } as LoadedConfig
  const confMermaid = {
    values: { view: 'mermaid' },
  } as LoadedConfig
  const confGui = {
    values: { view: 'gui' },
  } as LoadedConfig

  let startCalled = false
  let doneCalled = false
  let errCalled: unknown = false
  class MyView extends ViewClass<true> {
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

  const views: Views<true> = {
    human: MyView,
    mermaid: (x: true) => ({ underthesea: x }),
    gui: () => {},
  }

  t.test('using view class', async t => {
    const { onDone, onError } = startView(confHuman, views, {
      start: 100,
    })
    t.equal(startCalled, true)
    t.equal(doneCalled, false)
    t.equal(errCalled, false)
    await onDone(true)
    t.equal(doneCalled, true)
    t.equal(errCalled, false)
    const p = new Error('poop')
    onError?.(p)
    t.equal(errCalled, p)
    t.end()
  })

  t.test('using a view function for JSON', async t => {
    const { onDone, onError } = startView(confJson, views)
    t.equal(onError, undefined)
    t.equal(await onDone(true), true)
    // @ts-expect-error - testing error case
    t.equal(await onDone(undefined), undefined)
    t.end()
  })

  t.test('using a view function not json', async t => {
    const { onDone, onError } = startView(confMermaid, views)
    t.equal(onError, undefined)
    t.strictSame(await onDone(true), { underthesea: true })
    // @ts-expect-error - testing error case
    t.equal(await onDone(undefined), undefined)
    t.end()
  })

  t.test('using a view that returns undefined', async t => {
    const { onDone, onError } = startView(confGui, views)
    t.equal(onError, undefined)
    t.equal(typeof (await onDone(true)), 'undefined')
    t.end()
  })
})

t.test('outputCommand', async t => {
  const confJson = {
    values: { view: 'json' },
    get: (_k: 'color') => false,
  } as LoadedConfig
  const confHuman = {
    values: { view: 'human' },
    get: (_k: 'color') => false,
  } as LoadedConfig
  const confInspect = {
    values: { view: 'inspect' },
    get: (_k: 'color') => false,
  } as LoadedConfig
  const confHelp = {
    values: { help: true },
    get: (_k: 'color') => true,
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
    cliCommand.views = class extends ViewClass<true> {
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
})
