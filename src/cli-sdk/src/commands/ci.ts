import { install } from '@vltpkg/graph'
import { commandUsage } from '../config/usage.ts'
import { InstallReporter } from './install/reporter.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'
import type { InstallResult } from './install.ts'

export type CIResult = Omit<InstallResult, 'buildQueue'>

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
  json: i => i.graph.toJSON(),
  human: InstallReporter,
} as const satisfies Views<CIResult>

export const command: CommandFn<CIResult> = async conf => {
  const ciOptions = {
    ...conf.options,
    // allow all scripts by default on ci (unless user specifies a filter)
    allowScripts: conf.get('allow-scripts') ?? '*',
    expectLockfile: true,
    frozenLockfile: true,
    cleanInstall: true,
  }

  const { graph } = await install(ciOptions)
  return { graph }
}
