import { commandUsage } from '../config/usage.js'
import { type CliCommandUsage, type CliCommandFn } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'install-exec',
    usage: '[--package=<pkg>] [command...]',
    description:
      'Run a command defined by a package, installing it if necessary',
  })

export const command: CliCommandFn = async conf => {
  return [
    'TODO: exec, but install if not present',
    ...conf.positionals,
  ]
}
