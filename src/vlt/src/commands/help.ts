import { Config } from '../config/index.js'

export const usage = (await Config.load()).jack.usage()

export const command = async () => {
  console.log(usage)
}
