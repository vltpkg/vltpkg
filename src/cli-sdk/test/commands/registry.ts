import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const load = async (answers: string[] = []) => {
  const queue = [...answers]
  return t.mockImport<
    typeof import('../../src/commands/registry.ts')
  >('../../src/commands/registry.ts', {
    'node:readline/promises': {
      createInterface: () => ({
        question: async () => queue.shift() ?? '',
        close: () => {},
      }),
    },
  })
}

type Opts = {
  registry?: string
  registries?: Record<string, string>
  'default-registry-alias'?: string
}

const mkConf = (
  positionals: string[],
  options: Opts = {},
  help = false,
): LoadedConfig => {
  const values: Record<string, unknown> = { help }
  return {
    positionals,
    values,
    options: {
      registries: {},
      'default-registry-alias': 'npm',
      ...options,
    },
    command: undefined,
    get: (k: string) => (k === 'help' ? help : values[k]),
  } as unknown as LoadedConfig
}

t.test('usage', async t => {
  const mod = await load()
  t.matchSnapshot(mod.usage().usageMarkdown())
  t.equal(mod.views.human(), undefined)
})

t.test('help is a no-op (renders registry usage)', async t => {
  const mod = await load()
  const conf = mkConf(['main', 'whoami'], {}, true)
  await mod.dispatchRegistry(conf)
  t.equal(conf.command, undefined)
  t.strictSame(conf.positionals, ['main', 'whoami'])
})

t.test('no positional is a no-op', async t => {
  const mod = await load()
  const conf = mkConf([])
  await mod.dispatchRegistry(conf)
  t.equal(conf.command, undefined)
})

t.test('alias + subcommand dispatch', async t => {
  const mod = await load()
  const conf = mkConf(['main', 'token', 'list'], {
    registries: { main: 'https://m/' },
  })
  await mod.dispatchRegistry(conf, { interactive: false })
  t.equal(conf.command, 'token')
  t.strictSame(conf.positionals, ['list'])
  t.equal(conf.options.registry, 'https://m/')
  t.equal(conf.values.registry, 'https://m/')
})

t.test('subcommand without alias resolves default', async t => {
  const mod = await load()
  const conf = mkConf(['whoami'], {
    registries: { npm: 'https://n/' },
  })
  await mod.dispatchRegistry(conf, { interactive: false })
  t.equal(conf.command, 'whoami')
  t.strictSame(conf.positionals, [])
  t.equal(conf.options.registry, 'https://n/')
})

t.test('subcommand without alias prompts interactively', async t => {
  const mod = await load(['2'])
  const conf = mkConf(['logout'], {
    registries: { npm: 'https://n/', main: 'https://m/' },
  })
  await mod.dispatchRegistry(conf, {
    interactive: true,
    output: { write: () => true } as never,
  })
  t.equal(conf.command, 'logout')
  t.equal(conf.options.registry, 'https://m/')
})

t.test('unknown subcommand throws', async t => {
  const mod = await load()
  await t.rejects(
    mod.dispatchRegistry(
      mkConf(['main', 'frobnicate'], {
        registries: { main: 'https://m/' },
      }),
    ),
    { cause: { code: 'EUSAGE' } },
  )
})

t.test('alias with no subcommand throws', async t => {
  const mod = await load()
  await t.rejects(
    mod.dispatchRegistry(
      mkConf(['main'], { registries: { main: 'https://m/' } }),
    ),
    { cause: { code: 'EUSAGE' } },
  )
})

t.test(
  'command() throws when reached without a subcommand',
  async t => {
    const mod = await load()
    await t.rejects(mod.command(mkConf([])), {
      cause: { code: 'EUSAGE' },
    })
  },
)
