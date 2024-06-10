import { LoadedConfig } from '@vltpkg/config'

export const usage = `vlt run-exec [command ...]
Runs 'vlt run' if the command is a named script, 'vlt exec'`

export const command = async (conf: LoadedConfig) => {
  console.log('todo: run a script if present, otherwise execute')
  console.error(conf.positionals)
}
