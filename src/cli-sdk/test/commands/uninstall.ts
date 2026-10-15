import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { UninstallResult } from '../../src/commands/uninstall.ts'

const options = { scurry: new PathScurry() }
let log = ''
let uninstallOptions: Record<string, unknown> | undefined

const Command = await t.mockImport<
  typeof import('../../src/commands/uninstall.ts')
>('../../src/commands/uninstall.ts', {
  '@vltpkg/graph': {
    async uninstall(opts: Record<string, unknown>) {
      uninstallOptions = opts
      log += 'uninstall\n'
      return {
        graph: {},
      }
    },
  },
  '../../src/parse-add-remove-args.ts': {
    parseRemoveArgs: (conf: LoadedConfig, _scurry: PathScurry) => {
      const items =
        conf.positionals.length > 0 ?
          `from ${conf.positionals.join(',')}`
        : ''
      const values =
        Object.keys(conf.values).length > 0 ?
          `, with values ${Object.entries(conf.values).join('=')}`
        : ''
      log += `parse remove args ${items}${values}\n`
      return { remove: new Map() }
    },
  },
})
t.matchSnapshot(Command.usage().usage(), 'usage')

// removes a package
log = ''
await Command.command({
  positionals: ['abbrev@2'],
  values: {},
  options,
  get: (_key: string) => undefined,
} as LoadedConfig)
t.matchSnapshot(log, 'should uninstall a dependency')

// forwards --lockfile-only to the graph as `lockfileOnly`
log = ''
await Command.command({
  positionals: ['abbrev@2'],
  values: {},
  options: { ...options, 'lockfile-only': true },
  get: (_key: string) => undefined,
} as unknown as LoadedConfig)
t.equal(uninstallOptions?.lockfileOnly, true)

t.strictSame(
  Command.views.json({
    graph: {
      toJSON: () => ({ install: true }),
    },
  } as unknown as UninstallResult),
  { install: true },
)

t.test('--global', async t => {
  let glog = ''
  let resolveFails = false
  const remove = new Map()
  const dirs = ['/g/packages/foo-global-ws']
  const Command = await t.mockImport<
    typeof import('../../src/commands/uninstall.ts')
  >('../../src/commands/uninstall.ts', {
    '@vltpkg/graph': {
      async uninstall(_: unknown, r: unknown) {
        glog += `uninstall ${r === remove}\n`
        return { graph: {} }
      },
    },
    '../../src/parse-add-remove-args.ts': {
      parseRemoveArgs: () => {
        throw new Error('not global')
      },
    },
    '../../src/global-bin-dir.ts': {
      resolveGlobalBinDir: async () => {
        glog += 'resolve\n'
        if (resolveFails) throw new Error('not writable')
        return { dir: '/g/bin', source: 'global-dir', inPath: false }
      },
    },
    '../../src/global.ts': {
      assertGlobalOptions: () => {
        glog += 'assert\n'
      },
      parseGlobalRemoveArgs: () => {
        glog += 'parse global\n'
        return { remove, dirs }
      },
      removeGlobalPackages: async (
        root: string,
        d: string[],
        binDir: string,
      ) => {
        glog += `remove ${root} ${d === dirs} ${binDir}\n`
      },
    },
  })
  const conf = (globalBinDir?: string) =>
    ({
      globalRoot: '/g',
      globalBinDir,
      projectRoot: '/g',
      positionals: ['foo'],
      values: {},
      options,
      get: () => undefined,
    }) as unknown as LoadedConfig
  await Command.command(conf())
  t.equal(
    glog,
    'assert\nparse global\nresolve\nuninstall true\nremove /g true /g/bin\n',
  )

  // unusable --global-bin-dir: still swept by path
  glog = ''
  resolveFails = true
  await Command.command(conf('/ro'))
  t.equal(
    glog,
    'assert\nparse global\nresolve\nuninstall true\nremove /g true /ro\n',
  )
})
