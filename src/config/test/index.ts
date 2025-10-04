import { PackageJson } from '@vltpkg/package-json'
import type { SpawnOptions } from 'node:child_process'
import * as CP from 'node:child_process'
import { PathScurry } from 'path-scurry'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '@vltpkg/cli-sdk/config'
import { definition, recordsToPairs } from '@vltpkg/cli-sdk/config'

const mockConfig = (t: Test, mocks?: Record<string, any>) =>
  t.mockImport<typeof import('../src/index.ts')>(
    '../src/index.ts',
    mocks,
  )

let edited: string | undefined = undefined
const mockSpawnSync = (
  cmd: string,
  args: string[],
  options: SpawnOptions,
) => {
  t.matchOnly(args, [String, String])
  t.strictSame(options, { stdio: 'inherit' })
  t.equal(cmd, 'EDITOR')
  edited = args.at(-1)
  return { status: 0 }
}

class MockConfig {
  values: Record<string, any>
  positionals: string[]
  jack = definition
  deletedKeys?: ['project' | 'user', string[]]
  addedConfig?: ['project' | 'user', Record<string, any>]

  constructor(positionals: string[], values: Record<string, any>) {
    this.positionals = positionals
    this.values = values
    this.values.packageJson = new PackageJson()
    this.values.scurry = new PathScurry(t.testdirName)
  }
  get options() {
    return this.values
  }
  get(k: string) {
    return this.values[k]
  }
  getRecord(k: string) {
    const pairs = this.values[k]
    if (!pairs || !Array.isArray(pairs)) return {}
    const kv: Record<string, string> = {}
    for (const pair of pairs) {
      const eq: number = pair.indexOf('=')
      if (eq !== -1) {
        const key = pair.substring(0, eq)
        const val = pair.substring(eq + 1)
        kv[key] = val
      }
    }
    return kv
  }
  deleteConfigKeys(which: 'project' | 'user', fields: string[]) {
    this.deletedKeys = [which, fields]
  }
  async editConfigFile(
    which: 'project' | 'user',
    editFunction: (...a: any[]) => any,
  ) {
    await editFunction(which)
  }
  async addConfigToFile(
    which: 'project' | 'user',
    values: Record<string, any>,
  ) {
    this.addedConfig = [which, values]
  }
}

const run = async (
  t: Test,
  positionals: string[],
  values: Record<string, any>,
  spawnSync = mockSpawnSync,
) => {
  const conf = new MockConfig(positionals, values)
  const configFunctions = await mockConfig(t, {
    'node:child_process': t.createMock(CP, { spawnSync }),
  })

  const sub = positionals[0]
  let result: any

  switch (sub) {
    case 'set':
      result = await configFunctions.set(
        conf as unknown as LoadedConfig,
      )
      break
    case 'get':
      result = await configFunctions.get(
        conf as unknown as LoadedConfig,
      )
      break
    case 'ls':
    case 'list':
      result = configFunctions.list(conf as unknown as LoadedConfig)
      break
    case 'edit':
      result = await configFunctions.edit(
        conf as unknown as LoadedConfig,
      )
      break
    case 'del':
      result = await configFunctions.del(
        conf as unknown as LoadedConfig,
      )
      break
    default:
      throw new Error(`Unrecognized config function: ${sub}`)
  }

  return {
    result,
    conf,
  }
}

t.test('list', async t => {
  for (const cmd of ['list', 'ls']) {
    t.test(cmd, async t => {
      const vals = { some: 'options' }
      const { result } = await run(t, [cmd], vals)
      t.strictSame(result, recordsToPairs(vals))
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
    })
  }

  t.test('all (defaults to project)', async t => {
    const { conf } = await run(t, ['del', 'registry'], {
      config: 'all',
    })
    t.strictSame(conf.deletedKeys, ['project', ['registry']])
  })
  t.test('must specify key(s)', async t => {
    await t.rejects(run(t, ['del'], { config: 'user' }), {
      message: 'At least one key is required',
    })
  })

  t.test('dot-prop paths', async t => {
    t.test('delete registry property', async t => {
      const { conf } = await run(t, ['del', 'registries.local'], {
        config: 'project',
      })
      t.strictSame(conf.deletedKeys, [
        'project',
        ['registries.local'],
      ])
    })

    t.test('delete multiple registry properties', async t => {
      const { conf } = await run(
        t,
        ['del', 'registries.local', 'registries.staging'],
        { config: 'project' },
      )
      t.strictSame(conf.deletedKeys, [
        'project',
        ['registries.local', 'registries.staging'],
      ])
    })
  })
})

t.test('get', async t => {
  t.test('1 key', async t => {
    const registries = [
      'npm=https://registry.npmjs.org/',
      'vlt=https://registry.vlt.sh/',
    ]
    const { result } = await run(t, ['get', 'registries'], {
      registries,
    })
    t.strictSame(result, {
      npm: 'https://registry.npmjs.org/',
      vlt: 'https://registry.vlt.sh/',
    })
  })

  t.test('dot-prop path for registry', async t => {
    const mockOptions = {
      registries: [
        'local=http://localhost:1337',
        'npm=https://registry.npmjs.org/',
      ],
    }
    const { result } = await run(
      t,
      ['get', 'registries.local'],
      mockOptions,
    )
    t.strictSame(result, 'http://localhost:1337')
  })

  t.test('dot-prop non-existent registry', async t => {
    const mockOptions = {
      registries: ['npm=https://registry.npmjs.org/'],
    }
    const { result } = await run(
      t,
      ['get', 'registries.local'],
      mockOptions,
    )
    t.strictSame(result, undefined)
  })

  t.test('non dot-prop value', async t => {
    const mockOptions = {
      registry: 'https://registry.npmjs.org/',
    }
    const { result } = await run(t, ['get', 'registry'], mockOptions)
    t.strictSame(result, 'https://registry.npmjs.org/')
  })

  t.test('invalid dot-prop get value', async t => {
    await t.rejects(run(t, ['get', 'foo.'], {}), {
      message: 'Could not read property',
      cause: {
        found: 'foo.',
      },
    })
  })

  for (const i of [0, 2]) {
    t.test(`${i} keys`, async t => {
      await t.rejects(run(t, ['get', 'a', 'b'], {}), {
        message: 'Exactly one key is required',
      })
    })
  }
})

t.test('edit', async t => {
  for (const which of ['user', 'project']) {
    t.test(which, async t => {
      await run(t, ['edit'], {
        config: which,
        editor: 'EDITOR --passes-flags-to-args',
      })
      t.equal(edited, which)
    })
  }

  t.test('all (defaults to project)', async t => {
    await run(t, ['edit'], {
      config: 'all',
      editor: 'EDITOR --passes-flags-to-args',
    })
    t.equal(edited, 'project')
  })
  t.test('no editor', async t => {
    await t.rejects(run(t, ['edit'], { editor: '' }))
    await t.rejects(
      run(t, ['edit'], { editor: 'BAD_EDITOR --not-good' }, () => ({
        status: 100,
      })),
      {
        message: `BAD_EDITOR command failed`,
        cause: { status: 100, args: ['--not-good'] },
      },
    )
  })
})

t.test('set', async t => {
  t.test('nothing to set - creates empty config file', async t => {
    const { conf } = await run(t, ['set'], { config: 'project' })
    t.strictSame(conf.addedConfig, ['project', {}])
  })

  t.test(
    'nothing to set - creates empty user config file',
    async t => {
      const { conf } = await run(t, ['set'], { config: 'user' })
      t.strictSame(conf.addedConfig, ['user', {}])
    },
  )

  t.test('nothing to set with all (defaults to project)', async t => {
    const { conf } = await run(t, ['set'], { config: 'all' })
    t.strictSame(conf.addedConfig, ['project', {}])
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
    })
  }

  t.test('all (defaults to project)', async t => {
    const { conf } = await run(
      t,
      ['set', 'registry=https://example.com/'],
      { config: 'all' },
    )
    t.strictSame(conf.addedConfig, [
      'project',
      { registry: 'https://example.com/' },
    ])
  })

  t.test('invalid key', async t => {
    await t.rejects(run(t, ['set', 'garbage=value'], {}), {
      message: 'Invalid config keys',
      cause: {
        found: ['garbage'],
        validOptions: Object.keys(definition.toJSON()).sort((a, b) =>
          a.localeCompare(b, 'en'),
        ),
      },
    })
  })

  t.test('value provided to boolean', async t => {
    await t.rejects(run(t, ['set', 'bail=value'], {}), {
      message:
        'Boolean flag must be "bail" or "no-bail", not a value',
      cause: {
        code: 'ECONFIG',
        name: 'bail',
        found: 'bail=value',
      },
    })
  })

  t.test('no value for option that takes one', async t => {
    await t.rejects(run(t, ['set', 'workspace'], {}), {
      message: 'Set arguments must contain `=`',
      cause: {
        code: 'EUSAGE',
      },
    })
  })

  t.test('invalid value', async t => {
    await t.rejects(run(t, ['set', 'config=asdf'], {}), {
      message: 'Invalid value provided for config',
      cause: {
        code: 'ECONFIG',
        found: 'asdf',
        validOptions: ['all', 'user', 'project'],
      },
    })
  })

  t.test('invalid dot-prop set value', async t => {
    await t.rejects(run(t, ['set', 'foo.=bar'], {}), {
      message: 'Could not read property',
      cause: {
        found: 'foo.=bar',
      },
    })
  })

  t.test('dot-prop paths', async t => {
    t.test('set nested registry', async t => {
      const { conf } = await run(
        t,
        ['set', 'registries.local=http://localhost:1337'],
        { config: 'project' },
      )
      t.ok(conf.addedConfig, 'config should be added')
      const [which, configData] = conf.addedConfig!
      t.equal(which, 'project')
      t.strictSame(configData.registries, {
        local: 'http://localhost:1337',
      })
    })

    t.test('multiple registry paths', async t => {
      const { conf } = await run(
        t,
        [
          'set',
          'registries.local=http://localhost:1337',
          'registries.staging=http://staging.example.com',
        ],
        { config: 'project' },
      )
      t.ok(conf.addedConfig, 'config should be added')
    })

    t.test('mixed simple and dot-prop paths', async t => {
      const { conf } = await run(
        t,
        [
          'set',
          'registry=https://example.com/',
          'registries.local=http://localhost:1337',
        ],
        { config: 'project' },
      )
      t.ok(conf.addedConfig, 'config should be added')
    })
  })
})
