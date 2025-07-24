import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const mockCommand = (t: Test, mocks?: Record<string, any>) =>
  t.mockImport<typeof import('../../src/commands/config.ts')>(
    '../../src/commands/config.ts',
    mocks,
  )

// Mock the config functions to focus on CLI routing
const mockConfigFunctions = {
  get: async () => 'mocked-get-result',
  set: async () => undefined,
  edit: async () => undefined,
  list: () => ['color=auto', 'registry=https://registry.npmjs.org/'],
  del: async () => undefined,
}

class MockConfig {
  values: Record<string, any>
  positionals: string[]

  constructor(positionals: string[], values: Record<string, any>) {
    this.positionals = positionals
    this.values = values
    this.values.packageJson = new PackageJson()
    this.values.scurry = new PathScurry(t.testdirName)
  }
  get options() {
    return this.values
  }
}

const run = async (
  t: Test,
  positionals: string[],
  values: Record<string, any> = {},
) => {
  const conf = new MockConfig(positionals, values)
  const cmd = await mockCommand(t, {
    '@vltpkg/config': mockConfigFunctions,
  })
  return cmd.command(conf as unknown as LoadedConfig)
}

const USAGE = await mockCommand(t).then(C => C.usage().usage())

t.matchSnapshot(USAGE, 'usage')

t.test('command routing', async t => {
  t.test('get command', async t => {
    const result = await run(t, ['get', 'registry'])
    t.equal(result, 'mocked-get-result')
  })

  t.test('set command', async t => {
    const result = await run(t, ['set', 'registry=example.com'])
    t.equal(result, undefined)
  })

  t.test('list command', async t => {
    const result = await run(t, ['list'])
    t.strictSame(result, [
      'color=auto',
      'registry=https://registry.npmjs.org/',
    ])
  })

  t.test('ls alias', async t => {
    const result = await run(t, ['ls'])
    t.strictSame(result, [
      'color=auto',
      'registry=https://registry.npmjs.org/',
    ])
  })

  t.test('edit command', async t => {
    const result = await run(t, ['edit'])
    t.equal(result, undefined)
  })

  t.test('del command', async t => {
    const result = await run(t, ['del', 'registry'])
    t.equal(result, undefined)
  })

  t.test('invalid command', async t => {
    await t.rejects(run(t, ['invalid']), {
      message: 'Unrecognized config command',
      cause: {
        found: 'invalid',
        validOptions: ['set', 'get', 'list', 'edit', 'help', 'del'],
      },
    })
  })
})

t.test('help command', async t => {
  t.test('help with no arguments', async t => {
    const result = await run(t, ['help'])
    const output = result as string
    t.match(output, 'Specify one or more options to see information:')
    t.match(output, 'color')
    t.match(output, 'registry')
  })

  t.test('help with specific fields', async t => {
    const result = await run(t, ['help', 'registry', 'color'])
    const output = result as string
    t.match(output, '--registry=<url>')
    t.match(output, 'type: string')
    t.match(output, '--color')
    t.match(output, 'type: boolean')
  })

  t.test('help with unknown field', async t => {
    const result = await run(t, ['help', 'unknown-field'])
    const output = result as string
    t.match(output, 'unknown config field: unknown-field')
  })

  t.test('help shows record field types correctly', async t => {
    const result = await run(t, ['help', 'registries'])
    const output = result as string
    t.match(output, '--registries=<name=url>')
    t.match(output, 'type: Record<string, string>')
  })

  t.test('help shows array types correctly', async t => {
    const result = await run(t, ['help', 'workspace'])
    const output = result as string
    t.match(output, '--workspace=<ws>')
    t.match(output, 'type: string[]')
  })
})
