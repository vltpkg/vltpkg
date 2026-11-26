import { error } from '@vltpkg/error-cause'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { publish } from './publish.ts'
import type { CommandResult } from './publish.ts'

export { views } from './publish.ts'

const subcommands = ['publish']

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'stage',
    usage: 'publish',
    description: `Stage a package version for a person to approve.

    A staged version is uploaded to the registry but not served until
    a person approves it with a second factor. Staging never asks for
    one, so a CI workflow can stage and a maintainer approves. Approving
    publishes the version, rejecting deletes it.

    The registry must support staged publishing.`,
    subcommands: {
      publish: {
        description:
          'Pack and stage the package. Takes the same options as `vlt publish`.',
      },
    },
  })

export const command: CommandFn<CommandResult> = async conf => {
  const [sub] = conf.positionals
  if (sub === 'publish') return publish(conf, { stage: true })
  throw error(
    sub ?
      'Invalid stage subcommand'
    : 'stage command requires a subcommand',
    { code: 'EUSAGE', found: sub, validOptions: subcommands },
  )
}
