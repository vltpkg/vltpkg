import { commandUsage } from '../config/usage.ts'
import { install } from '@vltpkg/graph'
import { parseAddArgs } from '../parse-add-remove-args.ts'
import { InstallReporter } from './install/reporter.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { Diff, Graph } from '@vltpkg/graph'
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
  /**
   * The diff between the actual and ideal graphs, if available.
   */
  diff?: Diff
}

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'install',
    usage: '[packages ...]',
    description: `Install the specified packages, updating package.json and
                  vlt-lock.json appropriately.`,
    options: {
      'save-dev': {
        description:
          'Save installed packages to package.json as devDependencies.',
      },
      'save-optional': {
        description:
          'Save installed packages to package.json as optionalDependencies.',
      },
      'save-peer': {
        description:
          'Save installed packages to package.json as peerDependencies.',
      },
      'save-prod': {
        description:
          'Save installed packages to package.json as dependencies.',
      },
      workspace: {
        value: '<path|glob>',
        description:
          'Limit installation targets to matching workspaces.',
      },
      'workspace-group': {
        value: '<name>',
        description:
          'Limit installation targets to workspace groups.',
      },
      'expect-lockfile': {
        description: 'Fail if lockfile is missing or out of date.',
      },
      'frozen-lockfile': {
        description:
          'Fail if lockfile is missing or out of sync with package.json.',
      },
      'lockfile-only': {
        description:
          'Only update lockfile and package.json files; skip node_modules operations.',
      },
      'allow-scripts': {
        value: '<query>',
        description:
          'Filter which packages are allowed to run lifecycle scripts using DSS query syntax.',
      },
    },
  })

export const views = {
  json: i => {
    const added = i.diff?.nodes.add ?? new Set()
    const deleted = i.diff?.nodes.delete ?? new Set()

    // Build a map of deleted nodes by name for detecting changes
    const deletedByName = new Map<
      string,
      { name: string; version?: string }
    >()
    for (const node of deleted) {
      if (!node.importer) {
        deletedByName.set(node.name, {
          name: node.name,
          version: node.version,
        })
      }
    }

    const add: { name: string; version?: string }[] = []
    const change: {
      name: string
      from?: string
      to?: string
    }[] = []
    for (const node of added) {
      if (node.importer) continue
      const prev = deletedByName.get(node.name)
      if (prev) {
        // Package exists in both add and delete = changed
        change.push({
          name: node.name,
          from: prev.version,
          to: node.version,
        })
        deletedByName.delete(node.name)
      } else {
        add.push({ name: node.name, version: node.version })
      }
    }

    // Remaining deleted nodes that weren't matched = pure removals
    const remove = [...deletedByName.values()]

    return {
      add,
      added: add.length,
      change,
      changed: change.length,
      remove,
      removed: remove.length,
      ...(i.buildQueue?.length ?
        {
          buildQueue: i.buildQueue,
          message: `${i.buildQueue.length} packages that will need to be built, run "vlt build" to complete the install.`,
        }
      : null),
    }
  },
  human: InstallReporter,
} as const satisfies Views<InstallResult>

export const command: CommandFn<InstallResult> = async conf => {
  // TODO: we should probably throw an error if the user
  // tries to install using view=mermaid
  const monorepo = conf.options.monorepo
  const scurry = conf.options.scurry
  const { add } = parseAddArgs(conf, scurry, monorepo)
  const frozenLockfile = conf.options['frozen-lockfile']
  const expectLockfile = conf.options['expect-lockfile']
  const lockfileOnly = conf.options['lockfile-only']
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  const { buildQueue, graph, diff } = await install(
    {
      ...conf.options,
      frozenLockfile,
      expectLockfile,
      allowScripts,
      lockfileOnly,
    },
    add,
  )
  return { buildQueue, graph, diff }
}
