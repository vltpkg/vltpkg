import { Config } from '../config/index.js'
import { type CliCommand } from '../types.js'

export const usage: CliCommand['usage'] = async () =>
  (await Config.load()).jack

export const command = async () => {
  console.log((await usage()).usage())
}
