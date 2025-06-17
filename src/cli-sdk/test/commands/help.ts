import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

t.test('basic', async t => {
  const { usage, command } = await import(
    '../../src/commands/help.ts'
  )
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
  const result = await command({
    jack: { usage: () => 'usage' },
    positionals: [],
  } as unknown as LoadedConfig)
  t.equal(result, 'usage')
})

t.test('help with command argument', async t => {
  const { command } = await import('../../src/commands/help.ts')

  const result = await command({
    jack: { usage: () => 'general usage' },
    positionals: ['install'],
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
    } as unknown as LoadedConfig)
    t.match(helpResult, /Usage:\s+vlt help/)

    const installResult = await command({
      jack: { usage: () => 'general usage' },
      positionals: ['install'],
    } as unknown as LoadedConfig)
    t.match(installResult, /Usage:\s+vlt install/)
  },
)
