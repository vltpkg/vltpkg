import { error } from '@vltpkg/error-cause'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../load-command.ts'
import { loadCommand } from '../load-command.ts'
import { getCommand } from '../config/definition.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'help',
    usage: '[<command>]',
    description:
      'Print the full help output for the CLI, or help for a specific command',
    examples: {
      '': { description: 'Show general CLI help' },
      install: { description: 'Show help for the install command' },
      run: { description: 'Show help for the run command' },
    },
  })

export const command: CommandFn<string> = async conf => {
  // If no positional arguments, show general help
  if (conf.positionals.length === 0) {
    return conf.jack.usage()
  }

  // Get the command name from the first positional argument
  const cmdName = conf.positionals[0]
  const canonicalCmd = getCommand(cmdName)

  if (!canonicalCmd) {
    throw error(`Unknown command: ${cmdName}`, {
      found: cmdName,
      code: 'EUSAGE',
    })
  }

  const command = await loadCommand(canonicalCmd)
  return command.usage().usage()
}
