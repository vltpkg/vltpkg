import { commandUsage } from '../config/usage.ts'
import { install } from '@vltpkg/graph'
import { parseAddArgs } from '../parse-add-remove-args.ts'
import { InstallReporter } from './install/reporter.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { Graph } from '@vltpkg/graph'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

/**
 * The resulting object of an install operation. To be used by the view impl.
 */
export type InstallResult = {
  /**
   * A queue of package IDs that need to be built after the install is complete.
   */
  buildQueue?: DepID[]
  /**
   * The resulting graph structure at the end of an install.
   */
  graph: Graph
}

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'install',
    usage: '[packages ...]',
    description: `Install the specified packages, updating package.json and
                  vlt-lock.json appropriately.`,
  })

export const views = {
  json: i => ({
    ...(i.buildQueue?.length ?
      {
        buildQueue: i.buildQueue,
        message: `${i.buildQueue.length} packages that will need to be built, run "vlt build" to complete the install.`,
      }
    : null),
    graph: i.graph.toJSON(),
  }),
  human: InstallReporter,
} as const satisfies Views<InstallResult>

export const command: CommandFn<InstallResult> = async conf => {
  // TODO: we should probably throw an error if the user
  // tries to install using either view=mermaid or view=gui
  const monorepo = conf.options.monorepo
  const { add } = parseAddArgs(conf, monorepo)
  const frozenLockfile = conf.options['frozen-lockfile']
  const expectLockfile = conf.options['expect-lockfile']
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  const { buildQueue, graph } = await install(
    {
      ...conf.options,
      frozenLockfile,
      expectLockfile,
      allowScripts,
    },
    add,
  )
  return { buildQueue, graph }
}
