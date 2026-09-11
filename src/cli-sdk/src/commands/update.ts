import { update } from '@vltpkg/graph'
import { error } from '@vltpkg/error-cause'
import { commandUsage } from '../config/usage.ts'
import { planSpecConfigPersist } from '../persist-spec-config.ts'
import { asUnknownSpecPrefix } from '../require-registry.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { lazyView } from '../view.ts'
import type { Views } from '../view.ts'
import type { InstallResult } from './install.ts'

export const needsRegistry = true
export const needsNpmRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'update',
    usage: '',
    description: `Update dependencies to their latest in-range versions.
                  Discards the lockfile and resolves dependencies from scratch.
                  Registry and git host options given on the command line or
                  via env are saved to the project vlt.json.`,
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
    ...(i.persistedConfig ?
      { persistedConfig: i.persistedConfig }
    : null),
  }),
  human: lazyView(
    async () =>
      (await import('./install/reporter.ts')).InstallReporter,
  ),
} as const satisfies Views<InstallResult>

export const command: CommandFn<InstallResult> = async conf => {
  // Throw error if any arguments are provided
  if (conf.positionals.length > 0) {
    throw error('Arguments are not yet supported for vlt update', {
      code: 'EUSAGE',
    })
  }

  const persist = planSpecConfigPersist(conf)
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  const { buildQueue, graph } = await update({
    ...conf.options,
    allowScripts,
  }).catch((er: unknown) => {
    throw asUnknownSpecPrefix(er)
  })
  if (persist)
    await conf.addConfigToFile(persist.which, persist.values)
  return {
    buildQueue,
    graph,
    ...(persist ? { persistedConfig: persist } : null),
  }
}
