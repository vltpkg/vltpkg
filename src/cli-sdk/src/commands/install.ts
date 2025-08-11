import type { Graph } from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { install } from '@vltpkg/graph'
import { parseAddArgs } from '../parse-add-remove-args.ts'
import type { Views } from '../view.ts'
import { InstallReporter } from './install/reporter.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'install',
    usage: '[packages ...]',
    description: `Install the specified packages, updating package.json and
                  vlt-lock.json appropriately.`,
  })

export const views = {
  json: g => g.toJSON(),
  human: InstallReporter,
} as const satisfies Views<Graph>

export const command: CommandFn<Graph> = async conf => {
  const monorepo = conf.options.monorepo
  const { add } = parseAddArgs(conf, monorepo)
  const frozenLockfile = conf.options['frozen-lockfile']
  const expectLockfile = conf.options['expect-lockfile']
  const lockfileOnly = conf.options['lockfile-only']
  const { graph } = await install(
    {
      ...conf.options,
      frozenLockfile,
      expectLockfile,
      lockfileOnly,
    },
    add,
  )
  return graph
}
