import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'help',
    usage: '',
    description: 'Print the full help output for the CLI',
  })

export const command: CommandFn<string> = async conf => {
  return conf.jack.usage()
}
