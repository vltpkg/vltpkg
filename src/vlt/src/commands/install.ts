import { type Graph } from '@vltpkg/graph'
import { parseAddArgs } from '../parse-add-remove-args.js'
import {
  type CommandUsage,
  type Views,
  type CommandFnResultOnly,
} from '../types.js'
import { commandUsage } from '../config/usage.js'
import { install } from '../install.js'
import { InstallReporter } from './install/reporter.js'

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
