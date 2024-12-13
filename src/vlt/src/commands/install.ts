import { parseAddArgs } from '../parse-add-remove-args.js'
import { type CliCommandUsage, type CliCommandFn } from '../types.js'
import { commandUsage } from '../config/usage.js'
import { install } from '../install.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'install',
    usage: '[packages ...]',
    description: `Install the specified packages, updating package.json and
                  vlt-lock.json appropriately.`,
  })

export const command: CliCommandFn = async conf => {
  const monorepo = conf.options.monorepo
  const { add } = parseAddArgs(conf, monorepo)
  await install({ add, conf })
}
