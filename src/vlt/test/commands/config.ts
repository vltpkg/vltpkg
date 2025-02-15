import t from 'tap'
import type { Test } from 'tap'
import { definition, recordsToPairs } from '../../src/config/index.ts'
import type { LoadedConfig } from '../../src/config/index.ts'
import { PackageJson } from '@vltpkg/package-json'
import * as CP from 'node:child_process'
import type { SpawnOptions } from 'node:child_process'
import { PathScurry } from 'path-scurry'

const mockCommand = (t: Test, mocks?: Record<string, any>) =>
  t.mockImport<typeof import('../../src/commands/config.ts')>(
    '../../src/commands/config.ts',
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
  const cmd = await mockCommand(t, {
    child_process: t.createMock(CP, { spawnSync }),
  })
  return {
    result: await cmd
      .command(conf as unknown as LoadedConfig)
      .then(r => r?.result),
    conf,
  }
}

const USAGE = await mockCommand(t).then(C => C.usage().usage())

t.matchSnapshot(USAGE, 'usage')

t.test('help', async t => {
  const { result } = await run(t, ['help'], {})
  t.match(result, 'Specify one or more options to see information:')
})

t.test('help <options>', async t => {
  const { result } = await run(
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
  const expected = result as string
  t.match(expected, `--registry=<url>\n  type: string`)
  t.match(expected, `unknown config field: boof`)
  t.match(
    expected,
    `--registries=<name=url>\n  type: Record<string, string>`,
  )
  t.match(expected, `--workspace=<ws>\n  type: string[]`)
  t.match(expected, `--fetch-retry-maxtimeout=<n>\n  type: number`)
  t.match(expected, `--color\n  type: boolean`)
})

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
  t.test('must specify key(s)', async t => {
    await t.rejects(run(t, ['del'], { config: 'user' }), {
      message: 'At least one key is required',
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
    t.strictSame(result, registries)
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
  t.test('nothing to set', async t => {
    await t.rejects(run(t, ['set'], {}), {
      message: 'At least one key=value pair is required',
    })
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
