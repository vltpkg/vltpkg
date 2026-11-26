import t from 'tap'
import * as Publish from '../../src/commands/publish.ts'
import type { CommandResultSingle } from '../../src/commands/publish.ts'
import type { LoadedConfig } from '../../src/config/index.ts'

const result: CommandResultSingle = {
  id: 'a@1.0.0',
  name: 'a',
  version: '1.0.0',
  tag: 'latest',
  registry: 'https://registry.example.com',
  size: 1,
  unpackedSize: 1,
  files: [],
  staged: true,
}
const calls: unknown[][] = []

const Stage = await t.mockImport<
  typeof import('../../src/commands/stage.ts')
>('../../src/commands/stage.ts', {
  '../../src/commands/publish.ts': {
    ...Publish,
    publish: async (...args: unknown[]) => {
      calls.push(args)
      return result
    },
  },
})

const mkConf = (positionals: string[]) =>
  ({ positionals }) as unknown as LoadedConfig

t.beforeEach(() => {
  calls.length = 0
})

t.test('usage', async t => {
  t.matchSnapshot(Stage.usage().usage())
})

t.test('views are the publish views', async t => {
  t.equal(Stage.views, Publish.views)
})

t.test('publish stages with the publish command', async t => {
  const conf = mkConf(['publish'])
  t.equal(await Stage.command(conf), result)
  t.strictSame(calls, [[conf, { stage: true }]])
})

t.test('a subcommand is required', async t => {
  await t.rejects(Stage.command(mkConf([])), {
    message: 'stage command requires a subcommand',
    cause: { code: 'EUSAGE', validOptions: ['publish'] },
  })
  t.strictSame(calls, [])
})

t.test('an unknown subcommand is refused', async t => {
  await t.rejects(Stage.command(mkConf(['frobnicate'])), {
    message: 'Invalid stage subcommand',
    cause: {
      code: 'EUSAGE',
      found: 'frobnicate',
      validOptions: ['publish'],
    },
  })
  t.strictSame(calls, [])
})
