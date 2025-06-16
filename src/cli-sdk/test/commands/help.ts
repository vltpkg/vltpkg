import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/help.ts')
  >('../../src/commands/help.ts')
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
  const result = await command({
    jack: { usage: () => 'usage' },
    positionals: [],
  } as unknown as LoadedConfig)
  t.equal(result, 'usage')
})

t.test('help with command argument', async t => {
  const mockInstallUsage = () => ({
    usage: () => 'install command usage'
  })
  
  const { command } = await t.mockImport<
    typeof import('../../src/commands/help.ts')
  >('../../src/commands/help.ts', {
    '../commands/install.ts': {
      usage: mockInstallUsage
    }
  })

  const result = await command({
    jack: { usage: () => 'general usage' },
    positionals: ['install'],
  } as unknown as LoadedConfig)
  
  t.equal(result, 'install command usage')
})

t.test('help with invalid command', async t => {
  const { command } = await t.mockImport<
    typeof import('../../src/commands/help.ts')
  >('../../src/commands/help.ts')

  await t.rejects(
    command({
      jack: { usage: () => 'general usage' },
      positionals: ['nonexistent'],
    } as unknown as LoadedConfig),
    { 
      message: /Unknown command: nonexistent/,
      code: 'EUSAGE'
    }
  )
})

t.test('help with command alias', async t => {
  const mockInstallUsage = () => ({
    usage: () => 'install command usage'
  })
  
  const { command } = await t.mockImport<
    typeof import('../../src/commands/help.ts')
  >('../../src/commands/help.ts', {
    '../commands/install.ts': {
      usage: mockInstallUsage
    }
  })

  // Test 'i' alias for 'install'
  const result = await command({
    jack: { usage: () => 'general usage' },
    positionals: ['i'],
  } as unknown as LoadedConfig)
  
  t.equal(result, 'install command usage')
})
