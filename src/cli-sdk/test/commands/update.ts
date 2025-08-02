import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Graph } from '@vltpkg/graph'

const options = {}
let log = ''
t.afterEach(() => (log = ''))

const Command = await t.mockImport<
  typeof import('../../src/commands/update.ts')
>('../../src/commands/update.ts', {
  '@vltpkg/graph': {
    async update() {
      log += 'update\n'
      return {
        graph: {},
      }
    },
  },
})

t.test('usage', t => {
  t.matchSnapshot(Command.usage().usage(), 'usage')
  t.end()
})

t.test('update with no arguments', async t => {
  log = ''
  await Command.command({
    positionals: [],
    values: {},
    options,
  } as unknown as LoadedConfig)
  t.matchSnapshot(log, 'should call update with expected options')
})

t.test('update with arguments throws error', async t => {
  await t.rejects(
    Command.command({
      positionals: ['some-package'],
      values: {},
      options,
    } as unknown as LoadedConfig),
    {
      message: 'Arguments are not yet supported for vlt update',
      cause: { code: 'EUSAGE' },
    },
  )
})

t.test('update with multiple arguments throws error', async t => {
  await t.rejects(
    Command.command({
      positionals: ['package-a', 'package-b'],
      values: {},
      options,
    } as unknown as LoadedConfig),
    {
      message: 'Arguments are not yet supported for vlt update',
      cause: { code: 'EUSAGE' },
    },
  )
})

t.test('views.json returns graph toJSON', t => {
  const mockGraph = {
    toJSON: () => ({ updated: true }),
  } as unknown as Graph

  t.strictSame(Command.views.json(mockGraph), { updated: true })
  t.end()
})

t.test('views.human uses InstallReporter', t => {
  // Just check that the human view is the InstallReporter function
  t.type(Command.views.human, 'function')
  t.end()
})
