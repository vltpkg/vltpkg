import { Config } from '../config/index.js'

export const usage = async () => (await Config.load()).jack.usage()

export const command = async () => {
  console.log(await usage())
}
