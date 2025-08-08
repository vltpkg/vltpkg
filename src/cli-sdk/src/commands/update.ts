import { update } from '@vltpkg/graph'
import { error } from '@vltpkg/error-cause'
import type { Graph } from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { InstallReporter } from './install/reporter.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'update',
    usage: '',
    description: `Update dependencies to their latest in-range versions.
                  Discards the lockfile and resolves dependencies from scratch.`,
  })

export const views = {
  json: g => g.toJSON(),
  human: InstallReporter,
} as const satisfies Views<Graph>

export const command: CommandFn<Graph> = async conf => {
  // Throw error if any arguments are provided
  if (conf.positionals.length > 0) {
    throw error('Arguments are not yet supported for vlt update', {
      code: 'EUSAGE',
    })
  }

  const { graph } = await update(conf.options)
  return graph
}
