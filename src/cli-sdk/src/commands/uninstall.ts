import { uninstall } from '@vltpkg/graph'
import type { Graph } from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { parseRemoveArgs } from '../parse-add-remove-args.ts'
import {
  assertGlobalOptions,
  parseGlobalRemoveArgs,
  removeGlobalPackages,
} from '../global.ts'
import { resolveGlobalBinDir } from '../global-bin-dir.ts'
import {
  deferSelfRemove,
  refuseSelfUninstall,
  runningStoreDep,
} from '../self-update.ts'
import type { SelfRefused } from '../self-update.ts'
import { lazyView } from '../view.ts'
import type { Views } from '../view.ts'

export type UninstallResult = {
  /**
   * The resulting graph structure at the end of an uninstall.
   */
  graph: Graph
}

/** `vlt uninstall -g vlt` of a vlt that is not a global package */
export type UninstallCommandResult =
  UninstallResult | { self: SelfRefused }

export const needsRegistry = true
export const needsNpmRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'uninstall',
    usage: '[package ...]',
    description: `The opposite of \`vlt install\`. Removes deps and updates
                  vlt-lock.json and package.json appropriately.`,
    options: {
      workspace: {
        value: '<path|glob>',
        description:
          'Limit uninstall targets to matching workspaces.',
      },
      'workspace-group': {
        value: '<name>',
        description: 'Limit uninstall targets to workspace groups.',
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
      global: {
        description:
          'Uninstall global packages, removing their workspace and bins.',
      },
    },
  })

export const views = {
  json: i => ('graph' in i ? i.graph.toJSON() : { self: i.self }),
  human: lazyView(
    async () =>
      (await import('./install/reporter.ts')).InstallReporter,
  ),
} as const satisfies Views<UninstallCommandResult>

export const command: CommandFn<
  UninstallCommandResult
> = async conf => {
  if (conf.globalRoot) {
    assertGlobalOptions(conf)
    const refused = await refuseSelfUninstall(conf)
    if (refused) return { self: refused }
  }
  const { monorepo, scurry } = conf.options
  const global =
    conf.globalRoot ? parseGlobalRemoveArgs(conf) : undefined
  // only swept, so a bad --global-bin-dir must not block it
  const binDir =
    global ?
      await resolveGlobalBinDir(conf).catch(() => undefined)
    : undefined
  const { remove } = global ?? parseRemoveArgs(conf, scurry, monorepo)
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  // never removed from under itself
  const keep =
    conf.globalRoot ?
      await runningStoreDep(conf.globalRoot)
    : undefined
  const { graph } = await uninstall(
    {
      ...conf.options,
      allowScripts,
      lockfileOnly: conf.options['lockfile-only'],
      ...(keep ? { keepNodes: new Set([keep]) } : null),
    },
    remove,
  )
  if (global) {
    await deferSelfRemove(conf.projectRoot, graph, keep)
    await removeGlobalPackages(
      conf.projectRoot,
      global.dirs,
      binDir?.dir ?? conf.globalBinDir,
    )
  }
  return { graph }
}
