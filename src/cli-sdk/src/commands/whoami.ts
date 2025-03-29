import { RegistryClient } from '@vltpkg/registry-client'
import type { JSONField } from '@vltpkg/types'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'whoami',
    usage: [''],
    description: `Look up the username for the currently active token,
                  when logged into a registry.`,
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
    new URL('-/whoami', conf.options.registry),
    { cache: false },
  )
  const { username } = response.json()
  return { username }
}
