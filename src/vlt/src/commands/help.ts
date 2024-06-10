import { Config, LoadedConfig } from '../config/index.js'

export const usage = (await Config.load()).jack.usage()

export const command = async (conf: LoadedConfig) => {
  console.log('todo: show some helpful output', conf.positionals)
}
