import t from 'tap'
import { loadCommand } from '../src/load-command.ts'
import type { Commands } from '../src/config/definition.ts'

t.test('loads a valid command', async t => {
  const command = await loadCommand('install')
  t.ok(command, 'command is loaded')
  t.equal(typeof command.command, 'function', 'has command function')
  t.equal(typeof command.usage, 'function', 'has usage function')
  t.ok(command.views, 'has views')
})

t.test('throws for undefined command', async t => {
  await t.rejects(
    loadCommand(undefined),
    {
      message: 'Could not load command',
      cause: {
        found: undefined,
      },
    },
    'throws with correct error for undefined command',
  )
})

t.test('throws for non-existent command', async t => {
  await t.rejects(
    loadCommand(
      'non-existent-command' as unknown as Commands[keyof Commands],
    ),
    {
      message: 'Could not load command',
      cause: {
        found: 'non-existent-command',
      },
    },
    'throws with correct error for non-existent command',
  )
})
