import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { CIResult } from '../../src/commands/ci.ts'

const options = {}
let log = ''
t.afterEach(() => (log = ''))

const Command = await t.mockImport<
  typeof import('../../src/commands/ci.ts')
>('../../src/commands/ci.ts', {
  '@vltpkg/graph': {
    async install(opts: any) {
      log += `install expectLockfile=${opts.expectLockfile} cleanInstall=${opts.cleanInstall}\n`
      return {
        graph: {},
      }
    },
  },
})

t.test('usage', t => {
  const usage = Command.usage()
  t.matchSnapshot(usage.usage(), 'usage output')
  t.end()
})

t.test('command execution', async t => {
  await Command.command({
    positionals: [],
    values: {},
    options,
    get: () => undefined,
  } as unknown as LoadedConfig)
  t.matchSnapshot(
    log,
    'should call install with expectLockfile and cleanInstall true',
  )
})

t.test('views', t => {
  // Test json view
  t.strictSame(
    Command.views.json({
      graph: {
        toJSON: () => ({ ci: true }),
      },
    } as unknown as CIResult),
    { ci: true },
    'json view returns graph.toJSON()',
  )

  // Test human view is InstallReporter
  t.equal(
    Command.views.human.name,
    'InstallReporter',
    'human view uses InstallReporter',
  )

  t.end()
})

t.test('command description and examples', t => {
  const usage = Command.usage()
  const usageStr = usage.usage()

  t.ok(
    usageStr.includes('Clean install from lockfile'),
    'includes description',
  )
  t.ok(
    usageStr.includes('Deletes node_modules'),
    'mentions node_modules deletion',
  )
  t.ok(usageStr.includes('vlt-lock.json'), 'mentions lockfile')
  t.ok(
    usageStr.includes('--expect-lockfile'),
    'mentions expect-lockfile',
  )

  t.end()
})
