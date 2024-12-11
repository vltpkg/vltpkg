import { RegistryClient } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.js'
import { type CommandFn, type CommandUsage } from '../types.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'whoami',
    usage: [''],
    description: `Look up the username for the currently active token,
                  when logged into a registry.`,
  })

export const command: CommandFn<void> = async conf => {
  const rc = new RegistryClient(conf.options)
  const response = await rc.request(
    new URL('-/whoami', conf.options.registry),
    { cache: false },
  )
  const { username } = response.json()
  // eslint-disable-next-line no-console
  console.log(username)
}
