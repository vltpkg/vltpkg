import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { UninstallResult } from '../../src/commands/uninstall.ts'
import type { SelfRefused } from '../../src/self-update.ts'

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
        ...(opts.allowSkills ? { skills: { removed: [] } } : null),
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
t.notOk(
  'skills' in
    (await Command.command({
      positionals: [],
      values: {},
      options,
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig)),
  'no skills key when unset',
)

// passes allow-skills and skills-dir, returns skills
const res = (await Command.command({
  positionals: ['abbrev@2'],
  values: {},
  options,
  get: (k: string) =>
    k === 'allow-skills' ? '*'
    : k === 'skills-dir' ? ['.claude/skills']
    : undefined,
} as unknown as LoadedConfig)) as UninstallResult
t.equal(uninstallOptions?.allowSkills, '*')
t.strictSame(uninstallOptions?.skillsDirs, ['.claude/skills'])
t.strictSame(res.skills, { removed: [] })

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
  let keep: string | undefined = 'running'
  let refused: SelfRefused | undefined = undefined
  const remove = new Map()
  const dirs = ['/g/packages/foo-ws']
  const Command = await t.mockImport<
    typeof import('../../src/commands/uninstall.ts')
  >('../../src/commands/uninstall.ts', {
    '@vltpkg/graph': {
      async uninstall(o: { keepNodes?: Set<string> }, r: unknown) {
        const k = o.keepNodes ? ` ${[...o.keepNodes].join()}` : ''
        glog += `uninstall ${r === remove}${k}\n`
        return { graph: {} }
      },
    },
    '../../src/parse-add-remove-args.ts': {
      parseRemoveArgs: () => {
        throw new Error('not global')
      },
    },
    '../../src/self-update.ts': {
      refuseSelfUninstall: async () => {
        glog += 'self\n'
        return refused
      },
      runningStoreDep: async () => keep,
      deferSelfRemove: async (
        root: string,
        _: unknown,
        k?: string,
      ) => {
        glog += `defer ${root} ${k}\n`
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
    'assert\nself\nparse global\nresolve\nuninstall true running\ndefer /g running\nremove /g true /g/bin\n',
  )

  // unusable --global-bin-dir: still swept by path
  glog = ''
  resolveFails = true
  keep = undefined
  await Command.command(conf('/ro'))
  t.equal(
    glog,
    'assert\nself\nparse global\nresolve\nuninstall true\ndefer /g undefined\nremove /g true /ro\n',
  )

  // vlt that is not a global package
  glog = ''
  const no: SelfRefused = {
    status: 'refused',
    from: '1.0.0',
    dir: '/p/bin',
    message: 'no',
  }
  refused = no
  t.strictSame(await Command.command(conf()), { self: no })
  t.equal(glog, 'assert\nself\n', 'nothing removed')
  t.strictSame(Command.views.json({ self: no }), { self: no })
})
