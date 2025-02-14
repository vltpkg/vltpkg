import { commandUsage } from '../config/usage.ts'
import { type CommandFn, type CommandUsage } from '../index.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'install-exec',
    usage: '[--package=<pkg>] [command...]',
    description:
      'Run a command defined by a package, installing it if necessary',
  })

export const command: CommandFn<string> = async conf => {
  return [
    'TODO: exec, but install if not present',
    ...conf.positionals,
  ].join('\n')
}
