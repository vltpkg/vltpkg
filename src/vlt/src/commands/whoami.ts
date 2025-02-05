import { RegistryClient } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.js'
import {
  type CommandFnResultOnly,
  type CommandUsage,
  type Views,
} from '../types.js'
import { type JSONField } from '@vltpkg/types'

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

export const views: Views<CommandResult> = {
  defaultView: 'human',
  views: {
    human: r => r.username,
    json: r => r,
  },
}

export const command: CommandFnResultOnly<
  CommandResult
> = async conf => {
  const rc = new RegistryClient(conf.options)
  const response = await rc.request(
    new URL('-/whoami', conf.options.registry),
    { cache: false },
  )
  const { username } = response.json()
  return {
    result: { username },
  }
}
