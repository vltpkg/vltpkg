import { parseRemoveArgs } from '../parse-add-remove-args.ts'
import { type CommandFn, type CommandUsage } from '../types.ts'
import { commandUsage } from '../config/usage.ts'
import { uninstall } from '../uninstall.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'uninstall',
    usage: '[package ...]',
    description: `The opposite of \`vlt install\`. Removes deps and updates
                  vlt-lock.json and package.json appropriately.`,
  })

export const command: CommandFn<void> = async conf => {
  const monorepo = conf.options.monorepo
  const { remove } = parseRemoveArgs(conf, monorepo)
  await uninstall({ remove, conf })
}
