import type { Graph } from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { install } from '@vltpkg/graph'
import type { Views } from '../view.ts'
import { InstallReporter } from './install/reporter.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'ci',
    usage: '',
    description: `Clean install from lockfile. Deletes node_modules and installs 
                  dependencies exactly as specified in vlt-lock.json. This is 
                  similar to running 'vlt install --expect-lockfile' but performs 
                  a clean install by removing node_modules first.`,
    examples: {
      '': { description: 'Clean install from lockfile' },
    },
  })

export const views = {
  json: g => g.toJSON(),
  human: InstallReporter,
} as const satisfies Views<Graph>

export const command: CommandFn<Graph> = async conf => {
  const lockfileOnly = conf.options['lockfile-only']
  const ciOptions = {
    ...conf.options,
    expectLockfile: true,
    frozenLockfile: true,
    cleanInstall: true,
    lockfileOnly,
  }

  const { graph } = await install(ciOptions)
  return graph
}
