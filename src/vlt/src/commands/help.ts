import { commandUsage } from '../config/usage.ts'
import {
  type CommandUsage,
  type CommandFnResultOnly,
} from '../types.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'help',
    usage: '',
    description: 'Print the full help output for the CLI',
  })

export const command: CommandFnResultOnly<string> = async conf => {
  return { result: conf.jack.usage() }
}
