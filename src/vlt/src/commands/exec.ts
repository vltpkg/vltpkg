import { LoadedConfig } from '../config/index.js'

export const usage = `vlt exec [command]
Runs the command with all installed bins in the $PATH
If no command specified, an interactive subshell is spawned.`

export const command = async (conf: LoadedConfig) => {
  console.log('todo: execute the args with nm/.bin in the path')
  console.log(conf.positionals)
}
