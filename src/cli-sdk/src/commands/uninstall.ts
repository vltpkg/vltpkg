import { uninstall } from '@vltpkg/graph'
import type { Graph } from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { parseRemoveArgs } from '../parse-add-remove-args.ts'
import { InstallReporter } from './install/reporter.ts'
import { applyGlobalConfig, unlinkRemovedBins } from '../global.ts'
import { stderr } from '../output.ts'
import type { Views } from '../view.ts'

export type UninstallResult = {
  /**
   * The resulting graph structure at the end of an uninstall.
   */
  graph: Graph
}

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'uninstall',
    usage: '[package ...]',
    description: `The opposite of \`vlt install\`. Removes deps and updates
                  vlt-lock.json and package.json appropriately.`,
    options: {
      global: {
        description:
          'Uninstall packages globally and remove their linked binaries.',
      },
      workspace: {
        value: '<path|glob>',
        description:
          'Limit uninstall targets to matching workspaces.',
      },
      'workspace-group': {
        value: '<name>',
        description: 'Limit uninstall targets to workspace groups.',
      },
      'allow-scripts': {
        value: '<query>',
        description:
          'Filter which packages are allowed to run lifecycle scripts using DSS query syntax.',
      },
    },
  })

export const views = {
  json: i => i.graph.toJSON(),
  human: InstallReporter,
} as const satisfies Views<UninstallResult>

export const command: CommandFn<UninstallResult> = async conf => {
  const isGlobal = conf.get('global') === true
  if (isGlobal) {
    applyGlobalConfig(conf)
  }
  const { monorepo, scurry } = conf.options
  const { remove } = parseRemoveArgs(conf, scurry, monorepo)
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  const { graph } = await uninstall(
    { ...conf.options, allowScripts },
    remove,
  )

  if (isGlobal) {
    const removed = await unlinkRemovedBins(conf.options.projectRoot)
    if (removed.length > 0) {
      stderr(`Removed global binaries: ${removed.join(', ')}`)
    }
  }

  return { graph }
}
