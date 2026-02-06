import { update } from '@vltpkg/graph'
import { error } from '@vltpkg/error-cause'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { InstallReporter } from './install/reporter.ts'
import type { Views } from '../view.ts'
import type { InstallResult } from './install.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'update',
    usage: '',
    description: `Update dependencies to their latest in-range versions.
                  Discards the lockfile and resolves dependencies from scratch.`,
    options: {
      'allow-scripts': {
        value: '<query>',
        description:
          'Filter which packages are allowed to run lifecycle scripts using DSS query syntax.',
      },
    },
  })

export const views = {
  json: i => ({
    ...(i.buildQueue?.length ?
      {
        buildQueue: i.buildQueue,
        message: `${i.buildQueue.length} packages that will need to be built, run "vlt build" to complete the update.`,
      }
    : null),
    graph: i.graph.toJSON(),
  }),
  human: InstallReporter,
} as const satisfies Views<InstallResult>

export const command: CommandFn<InstallResult> = async conf => {
  // Throw error if any arguments are provided
  if (conf.positionals.length > 0) {
    throw error('Arguments are not yet supported for vlt update', {
      code: 'EUSAGE',
    })
  }

  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  const { buildQueue, graph } = await update({
    ...conf.options,
    allowScripts,
  })
  return { buildQueue, graph }
}
