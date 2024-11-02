import { Config } from '../config/index.js'
import { type CliCommandUsage, CliCommandFn } from '../types.js'

export const usage: CliCommandUsage = async () =>
  (await Config.load()).jack

export const command: CliCommandFn = async () => {
  return (await usage()).usage()
}
