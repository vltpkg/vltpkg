import { type Graph } from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import { type CommandFn, type CommandUsage } from '../index.ts'
import { install } from '../install.ts'
import { parseAddArgs } from '../parse-add-remove-args.ts'
import { type Views } from '../view.ts'
import { InstallReporter } from './install/reporter.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'install',
    usage: '[packages ...]',
    description: `Install the specified packages, updating package.json and
                  vlt-lock.json appropriately.`,
  })

export const views: Views<Graph> = {
  json: g => g.toJSON(),
  human: InstallReporter,
}

export const command: CommandFn<Graph> = async conf => {
  const monorepo = conf.options.monorepo
  const { add } = parseAddArgs(conf, monorepo)
  const { graph } = await install({ add, conf })
  return graph
}
