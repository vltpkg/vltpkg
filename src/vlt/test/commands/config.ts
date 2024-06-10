import t, { Test } from 'tap'

import { definition, LoadedConfig } from '../../src/config/index.js'

let edited: string | undefined = undefined
const mockOpenEditor = (paths: string[], options: any) => {
  t.matchOnly(paths, [String])
  t.strictSame(options, { wait: true })
  edited = paths[0]
}

class MockConfig {
  values: Record<string, any>
  positionals: string[]
  jack = definition
  deletedKeys?: ['user' | 'project', string[]]
  addedConfig?: ['user' | 'project', Record<string, any>]

  constructor(positionals: string[], values: Record<string, any>) {
    this.positionals = positionals
    this.values = values
  }
  get options() {
    return this.values
  }
  get(k: string) {
    return this.values[k]
  }
  deleteConfigKeys(which: 'user' | 'project', fields: string[]) {
    this.deletedKeys = [which, fields]
  }
  async editConfigFile(
    which: 'user' | 'project',
    editFunction: (...a: any[]) => any,
  ) {
    await editFunction(which)
  }
  async addConfigToFile(
    which: 'user' | 'project',
    values: Record<string, any>,
  ) {
    this.addedConfig = [which, values]
  }
}

// Note: have to use console.debug() in this test, because we
// hijack these.
const consoleErrors = t.capture(console, 'error').args
const consoleLogs = t.capture(console, 'log').args

const run = async (
  t: Test,
  positionals: string[],
  values: Record<string, any>,
) => {
  const conf = new MockConfig(positionals, values)
  const cmd = await t.mockImport<
    typeof import('../../src/commands/config.js')
  >('../../src/commands/config.js', {
    'open-editor': mockOpenEditor,
  })
  return {
    result: await cmd.command(conf as unknown as LoadedConfig),
    conf,
  }
}

let USAGE: string
t.test('has usage', async t => {
  const { usage } = await t.mockImport('../../src/commands/config.js')
  USAGE = usage
  t.type(usage, 'string')
})

t.test('show usage', async t => {
  t.test('explicit -h', async t => {
    await run(t, ['get'], { help: true })
    t.strictSame(consoleLogs(), [[USAGE]])
    t.strictSame(consoleErrors(), [])
  })
  t.test('no sub', async t => {
    await run(t, [], {})
    t.strictSame(consoleLogs(), [[USAGE]])
    t.strictSame(consoleErrors(), [])
  })
})

t.test('help', async t => {
  await run(t, ['help'], {})
  t.matchOnly(consoleLogs(), [
    ['Specify one or more options to see information:'],
    [String],
  ])
  t.strictSame(consoleErrors(), [])
})

t.test('help <options>', async t => {
  await run(
    t,
    [
      'help',
      'registry',
      'boof',
      'registries',
      'workspace',
      'fetch-retry-maxtimeout',
      'color',
    ],
    {},
  )
  t.matchOnly(consoleLogs(), [
    ['--registry=<url>\n  type: string\n'],
    ['unknown config field: boof'],
    ['--registries=<name=url>\n  type: Record<string, string>\n'],
    ['--workspace=<ws>\n  type: string[]\n'],
    ['--fetch-retry-maxtimeout=<n>\n  type: number'],
    ['--color\n  type: boolean'],
  ])
  t.strictSame(consoleErrors(), [])
})

t.test('list', async t => {
  for (const cmd of ['list', 'ls']) {
    t.test(cmd, async t => {
      const vals = { some: 'options' }
      await run(t, [cmd], vals)
      t.strictSame(consoleErrors(), [])
      t.strictSame(consoleLogs(), [[JSON.stringify(vals, null, 2)]])
    })
  }
})

t.test('del', async t => {
  for (const which of ['user', 'project']) {
    t.test(which, async t => {
      const { conf } = await run(t, ['del', 'registry'], {
        config: which,
      })
      t.strictSame(conf.deletedKeys, [which, ['registry']])
      t.strictSame(consoleLogs(), [])
      t.strictSame(consoleErrors(), [])
    })
  }
  t.test('must specify key(s)', async t => {
    await t.rejects(run(t, ['del'], { config: 'user' }), {
      message: 'At least one key is required',
    })
    t.strictSame(consoleLogs(), [])
    t.strictSame(consoleErrors(), [[USAGE]])
  })
})

t.test('get', async t => {
  t.test('1 key', async t => {
    const registries = [
      'npm=https://registry.npmjs.org/',
      'vlt=https://registry.vlt.sh/',
    ]
    await run(t, ['get', 'registries'], { registries })
    t.strictSame(consoleLogs(), [
      [JSON.stringify(registries, null, 2)],
    ])
    t.strictSame(consoleErrors(), [])
  })
  for (const i of [0, 2]) {
    t.test(`${i} keys`, async t => {
      await t.rejects(run(t, ['get', 'a', 'b'], {}), {
        message: 'Exactly one key is required',
      })
      t.strictSame(consoleLogs(), [])
      t.strictSame(consoleErrors(), [[USAGE]])
    })
  }
})

t.test('edit', async t => {
  for (const which of ['user', 'project']) {
    t.test(which, async t => {
      await run(t, ['edit'], { config: which })
      t.equal(edited, which)
    })
  }
})

t.test('set', async t => {
  t.test('nothing to set', async t => {
    await t.rejects(run(t, ['set'], {}), {
      message: 'At least one key=value pair is required',
    })
    t.strictSame(consoleLogs(), [])
    t.strictSame(consoleErrors(), [[USAGE]])
  })
  for (const which of ['user', 'project']) {
    t.test(which, async t => {
      const { conf } = await run(
        t,
        ['set', 'registry=https://example.com/'],
        { config: which },
      )
      t.strictSame(conf.addedConfig, [
        which,
        { registry: 'https://example.com/' },
      ])
      t.strictSame(consoleLogs(), [])
      t.strictSame(consoleErrors(), [])
    })
  }
})

t.test('garbage', async t => {
  await t.rejects(run(t, ['garbage'], {}), {
    message: 'Unrecognized config command',
    cause: {
      found: 'garbage',
      validOptions: [String, String, String],
    },
  })
})
