import { RegistryClient } from '@vltpkg/registry-client'
import type { JSONField } from '@vltpkg/types'
import { commandUsage } from '../config/usage.ts'
import { resolveRegistry } from '../require-registry.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'whoami',
    usage: [''],
    description: `Look up the username for the currently active token,
                  when logged into a registry.

                  Target a specific configured registry by alias with
                  \`vlt registry <alias> whoami\`.`,
    options: {
      registry: {
        value: '<url>',
        description:
          'Registry URL to query for authenticated user info.',
      },
      identity: {
        value: '<name>',
        description:
          'Identity namespace used to look up auth tokens.',
      },
    },
  })

type CommandResult = {
  username?: JSONField
}

export const views = {
  human: r => r.username,
  json: r => r,
} as const satisfies Views<CommandResult>

export const command: CommandFn<CommandResult> = async conf => {
  const rc = new RegistryClient(conf.options)
  const response = await rc.request(
    new URL('-/whoami', await resolveRegistry(conf)),
    { useCache: false },
  )
  const { username } = response.json()
  return { username }
}
