import { LoadedConfig } from '../config/index.js'

export const usage = `vlt install-exec [--package=<pkg>] [command...]
Run a command defined by a package, installing it if necessary`

export const command = async (conf: LoadedConfig) => {
  console.log('todo: exec, but install if not present')
  console.error(conf.positionals)
}
