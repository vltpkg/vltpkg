import { LoadedConfig } from '@vltpkg/config'

export const usage = `vlt run <script> [args ...]
Run the named script from package.json`

export const command = async (conf: LoadedConfig) => {
  console.log('todo: run a script from package.json')
  console.error(conf.positionals)
}
