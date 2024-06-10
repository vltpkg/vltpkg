import t from 'tap'

import { run } from './fixtures/run.js'

t.beforeEach(() => {
  for (const k of Object.keys(process.env)) {
    if (k.toUpperCase().startsWith('VLT_')) {
      delete process.env[k]
    }
  }
})

t.test('infer workspace', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': '"src/foo"',
    src: {
      foo: {
        'package.json': JSON.stringify({ name: '@acme/foo' }),
      },
    },
  })
  t.chdir(dir + '/src/foo')
  let commandRun = false
  const { er, config } = await run(t, 'index.js', ['install'], {
    '../../src/commands/install.js': {
      command: () => {
        commandRun = true
      },
    },
  })
  t.equal(commandRun, true)
  t.equal(er, undefined)
  t.strictSame(config.get('workspace'), ['src/foo'])
})

t.test('print usage', async t => {
  t.chdir(
    t.testdir({
      '.git': {},
      'vlt.json': JSON.stringify({}),
    }),
  )
  let commandRun = false
  const { er, logs } = await run(t, 'index.js', ['install', '-h'], {
    '../../src/commands/install.js': {
      usage: 'im helping!!! im helping youuuuuu',
      command: () => {
        commandRun = true
      },
    },
  })
  t.equal(commandRun, false)
  t.equal(er, undefined)
  t.strictSame(logs, [['im helping!!! im helping youuuuuu']])
})
