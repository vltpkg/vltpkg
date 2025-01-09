import { parseRemoveArgs } from '../parse-add-remove-args.js'
import { type CliCommandFn, type CliCommandUsage } from '../types.js'
import { commandUsage } from '../config/usage.js'
import { uninstall } from '../uninstall.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'uninstall',
    usage: '[package ...]',
    description: `The opposite of \`vlt install\`. Removes deps and updates
                  vlt-lock.json and package.json appropriately.`,
  })

export const command: CliCommandFn = async conf => {
  const monorepo = conf.options.monorepo
  const { remove } = parseRemoveArgs(conf, monorepo)
  await uninstall({ remove, conf })
}
