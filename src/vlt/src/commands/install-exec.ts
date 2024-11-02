import { LoadedConfig } from '../config/index.js'
import { commandUsage } from '../config/usage.js'
import { CliCommand } from '../types.js'

export const usage: CliCommand['usage'] = () =>
  commandUsage({
    command: 'install-exec',
    usage: '[--package=<pkg>] [command...]',
    description:
      'Run a command defined by a package, installing it if necessary',
  })

export const command = async (conf: LoadedConfig) => {
  console.log('todo: exec, but install if not present')
  console.error(conf.positionals)
}
