import { commandUsage } from '../config/usage.js'
import { type CliCommandUsage, CliCommandFn } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'help',
    usage: '',
    description: 'Print the full help output for the CLI',
  })

export const command: CliCommandFn = async conf => {
  return conf.jack.usage()
}
