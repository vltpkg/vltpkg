import { LoadedConfig } from '@vltpkg/config'

export const usage = `vlt install [package ...]
Install the specified package, updating dependencies appropriately`

export const command = async (conf: LoadedConfig) => {
  console.log('todo: update deps, reify')
  console.error(conf.positionals)
}
