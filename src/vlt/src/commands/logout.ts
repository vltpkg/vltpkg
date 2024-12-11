import { RegistryClient } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.js'
import { type CommandFn, type CommandUsage } from '../types.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'logout',
    usage: [''],
    description: `Log out of the default registry, deleting the token from
                  the local keychain, as well as destroying it on the server.`,
  })

export const command: CommandFn = async conf => {
  const rc = new RegistryClient(conf.options)
  await rc.logout(conf.options.registry)
}
