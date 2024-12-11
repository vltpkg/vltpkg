import { type Graph } from '@vltpkg/graph'
import { parseAddArgs } from '../parse-add-remove-args.js'
import {
  type CliCommandUsage,
  type CliCommandFn,
  type Views,
} from '../types.js'
import { commandUsage } from '../config/usage.js'
import { install } from '../install.js'
import humanReporter from './install/reporter.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'install',
    usage: '[packages ...]',
    description: `Install the specified packages, updating package.json and
                  vlt-lock.json appropriately.`,
  })

export const views = {
  json: {
    fn: (g: Graph) => JSON.stringify(g, null, 2),
  },
  human: {
    renderer: 'ink',
    fn: humanReporter,
  },
} satisfies Views

export const defaultView = 'human'

export const command: CliCommandFn<Graph> = async conf => {
  const monorepo = conf.options.monorepo
  const { add } = parseAddArgs(conf, monorepo)
  const { graph } = await install({ add, conf })
  return { result: graph }
}
