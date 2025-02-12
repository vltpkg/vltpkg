import type { Graph } from '@vltpkg/graph'
import { parseAddArgs } from '../parse-add-remove-args.ts'
import type {
  CommandUsage,
  Views,
  CommandFnResultOnly,
} from '../types.ts'
import { commandUsage } from '../config/usage.ts'
import { install } from '../install.ts'
import { InstallReporter } from './install/reporter.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'install',
    usage: '[packages ...]',
    description: `Install the specified packages, updating package.json and
                  vlt-lock.json appropriately.`,
  })

export const views: Views<Graph> = {
  /* c8 ignore next */
  defaultView: process.stdout.isTTY ? 'human' : 'json',
  views: {
    json: g => g.toJSON(),
    human: InstallReporter,
  },
}

export const command: CommandFnResultOnly<Graph> = async conf => {
  const monorepo = conf.options.monorepo
  const { add } = parseAddArgs(conf, monorepo)
  const { graph } = await install({ add, conf })
  return { result: graph }
}
