import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

let log = ''
let mockPackageJson: any = {}

class MockPackageJson {
  read(cwd: string) {
    log += `read package.json from ${cwd}\n`
    return mockPackageJson
  }
  write(cwd: string, pj: any) {
    log += `write package.json to ${cwd}\n`
    mockPackageJson = pj
  }
}

t.afterEach(() => {
  log = ''
  mockPackageJson = {}
})

const Command = await t.mockImport<
  typeof import('../../src/commands/use.ts')
>('../../src/commands/use.ts', {
  '@vltpkg/graph': {
    async install() {
      log += 'install\n'
      return {
        graph: {},
      }
    },
  },
  '../../src/parse-add-remove-args.ts': {
    parseAddArgs: (conf: LoadedConfig) => {
      const items =
        conf.positionals.length > 0 ?
          `from ${conf.positionals.join(',')}`
        : ''
      const values =
        Object.keys(conf.values).length > 0 ?
          `, with values ${Object.entries(conf.values)
            .map(([k, v]) => `${k}=${v}`)
            .join(',')}`
        : ''
      log += `parse add args ${items}${values}\n`
      return { add: new Map() }
    },
  },
  '@vltpkg/package-json': {
    PackageJson: MockPackageJson,
  },
})

t.matchSnapshot(Command.usage().usage(), 'usage')

t.test('should require at least one runtime specifier', async t => {
  await t.rejects(
    Command.command({
      positionals: [],
      values: {},
      options: {
        packageJson: new MockPackageJson(),
        projectRoot: '/test',
      },
    } as unknown as LoadedConfig),
    { message: 'At least one runtime specifier is required' },
  )
})

t.test('should install node runtime', async t => {
  mockPackageJson = { engines: {} }

  await Command.command({
    positionals: ['node@lts'],
    values: {},
    options: { packageJson: new MockPackageJson(), cwd: '/test' },
  } as unknown as LoadedConfig)

  t.matchSnapshot(log, 'should install node@lts as devDependency')
  t.match(mockPackageJson.engines, { node: '$node' })
})

t.test('should install multiple runtimes', async t => {
  mockPackageJson = { engines: {} }

  await Command.command({
    positionals: ['node@lts', 'npm@latest'],
    values: {},
    options: { packageJson: new MockPackageJson(), cwd: '/test' },
  } as unknown as LoadedConfig)

  t.matchSnapshot(log, 'should install multiple runtimes')
  t.match(mockPackageJson.engines, { node: '$node', npm: '$npm' })
})

t.test(
  'should use publishConfig.engines with --publish flag',
  async t => {
    mockPackageJson = { engines: {} }

    await Command.command({
      positionals: ['node@20'],
      values: { publish: true },
      options: { packageJson: new MockPackageJson(), cwd: '/test' },
    } as unknown as LoadedConfig)

    t.matchSnapshot(
      log,
      'should use publishConfig with --publish flag',
    )
    t.match(mockPackageJson.publishConfig?.engines, { node: '$node' })
    t.not(mockPackageJson.engines, { node: '$node' })
  },
)

t.test('should reject unknown runtime', async t => {
  await t.rejects(
    Command.command({
      positionals: ['unknown@1.0.0'],
      values: {},
      options: { packageJson: new MockPackageJson(), cwd: '/test' },
    } as unknown as LoadedConfig),
    { message: 'Unknown runtime: unknown' },
  )
})

t.test('should handle deno runtime', async t => {
  mockPackageJson = { engines: {} }

  await Command.command({
    positionals: ['deno@1.40.0'],
    values: {},
    options: { packageJson: new MockPackageJson(), cwd: '/test' },
  } as unknown as LoadedConfig)

  t.matchSnapshot(log, 'should install deno runtime')
  t.match(mockPackageJson.engines, { deno: '$deno' })
})

t.test('should handle runtime without version', async t => {
  mockPackageJson = { engines: {} }

  await Command.command({
    positionals: ['bun'],
    values: {},
    options: { packageJson: new MockPackageJson(), cwd: '/test' },
  } as unknown as LoadedConfig)

  t.matchSnapshot(log, 'should install bun runtime without version')
  t.match(mockPackageJson.engines, { bun: '$bun' })
})

t.test('should handle existing engines field', async t => {
  mockPackageJson = { engines: { node: '>=18' } }

  await Command.command({
    positionals: ['npm@latest'],
    values: {},
    options: { packageJson: new MockPackageJson(), cwd: '/test' },
  } as unknown as LoadedConfig)

  t.matchSnapshot(log, 'should preserve existing engines')
  t.match(mockPackageJson.engines, { node: '>=18', npm: '$npm' })
})

t.test(
  'should create publishConfig when using --publish flag',
  async t => {
    mockPackageJson = {}

    await Command.command({
      positionals: ['node@latest'],
      values: { publish: true },
      options: { packageJson: new MockPackageJson(), cwd: '/test' },
    } as unknown as LoadedConfig)

    t.matchSnapshot(log, 'should create publishConfig')
    t.match(mockPackageJson.publishConfig?.engines, { node: '$node' })
    t.notOk(mockPackageJson.engines)
  },
)

t.test('should handle edge case with empty version', async t => {
  mockPackageJson = { engines: {} }

  await Command.command({
    positionals: ['yarn@'],
    values: {},
    options: { packageJson: new MockPackageJson(), cwd: '/test' },
  } as unknown as LoadedConfig)

  t.matchSnapshot(log, 'should handle empty version')
  t.match(mockPackageJson.engines, { yarn: '$yarn' })
})

t.test('should create engines field when missing', async t => {
  mockPackageJson = {} // No engines field

  await Command.command({
    positionals: ['pnpm@latest'],
    values: {},
    options: { packageJson: new MockPackageJson(), cwd: '/test' },
  } as unknown as LoadedConfig)

  t.matchSnapshot(log, 'should create engines field')
  t.match(mockPackageJson.engines, { pnpm: '$pnpm' })
})
