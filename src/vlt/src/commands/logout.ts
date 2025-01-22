import { RegistryClient } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.js'
import { type CliCommandFn, type CliCommandUsage } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'logout',
    usage: [''],
    description: `Log out of the default registry, deleting the token from
                  the local keychain, as well as destroying it on the server.`,
  })

export const command: CliCommandFn = async conf => {
  const rc = new RegistryClient(conf.options)
  await rc.logout(conf.options.registry)
}
