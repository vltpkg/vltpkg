import { commandUsage } from '../config/usage.js'
import { type CommandUsage, type CommandFn } from '../types.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'install-exec',
    usage: '[--package=<pkg>] [command...]',
    description:
      'Run a command defined by a package, installing it if necessary',
  })

export const command: CommandFn = async conf => {
  return {
    result: [
      'TODO: exec, but install if not present',
      ...conf.positionals,
    ].join('\n'),
  }
}
