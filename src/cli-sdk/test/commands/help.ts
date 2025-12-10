import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

t.cleanSnapshot = (s: string) =>
  s.replaceAll(/v\d+\.\d+\.\d+(-[a-z0-9.-]+)?/g, '{{VERSION}}')

t.test('basic', async t => {
  const { usage, command } =
    await import('../../src/commands/help.ts')
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'jack usage')
  const result = await command({
    jack: { usage: () => 'usage' },
    positionals: [],
    values: { all: true },
  } as unknown as LoadedConfig)
  t.matchSnapshot(result, 'all usage')
  const result2 = await command({
    jack: { usage: () => 'usage' },
    positionals: [],
    values: { all: false },
  } as unknown as LoadedConfig)
  t.matchSnapshot(result2, 'default usage')
})

t.test('help with command argument', async t => {
  const { command } = await import('../../src/commands/help.ts')

  const result = await command({
    jack: { usage: () => 'general usage' },
    positionals: ['install'],
    values: {},
  } as unknown as LoadedConfig)

  // Should return the actual install command usage, not a mock
  t.match(result, /Usage:\s+vlt install/)
})

t.test('help with invalid command', async t => {
  const { command } = await import('../../src/commands/help.ts')

  try {
    await command({
      jack: { usage: () => 'general usage' },
      positionals: ['nonexistent'],
      values: {},
    } as unknown as LoadedConfig)
    t.fail('should have thrown')
  } catch (err: any) {
    t.equal(err.message, 'Unknown command: nonexistent')
    t.equal(err.cause?.code, 'EUSAGE')
  }
})

t.test('help with command alias', async t => {
  const { command } = await import('../../src/commands/help.ts')

  // Test 'i' alias for 'install'
  const result = await command({
    jack: { usage: () => 'general usage' },
    positionals: ['i'],
    values: {},
  } as unknown as LoadedConfig)

  // Should return the actual install command usage, same as 'install'
  t.match(result, /Usage:\s+vlt install/)
})

t.test(
  'help with valid commands covers main functionality',
  async t => {
    // Test that the main functionality works correctly
    const { command } = await import('../../src/commands/help.ts')

    // Test that a few different valid commands work
    const helpResult = await command({
      jack: { usage: () => 'general usage' },
      positionals: ['help'],
      values: {},
    } as unknown as LoadedConfig)
    t.match(helpResult, /Usage:\s+vlt help/)

    const installResult = await command({
      jack: { usage: () => 'general usage' },
      positionals: ['install'],
      values: {},
    } as unknown as LoadedConfig)
    t.match(installResult, /Usage:\s+vlt install/)
  },
)
