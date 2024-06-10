import { LoadedConfig } from '@vltpkg/config'

export const usage = `vlt uninstall [package ...]
Remove the named packages from the dependency graph`

export const command = async (conf: LoadedConfig) => {
  console.log('todo: remove deps, reify')
  console.error(conf.positionals)
}
