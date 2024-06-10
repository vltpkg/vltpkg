import { Config, LoadedConfig } from '@vltpkg/config'

export const usage = (await Config.load()).jack.usage()

export const command = async (conf: LoadedConfig) => {
  console.log('todo: show some helpful output', conf.positionals)
}
