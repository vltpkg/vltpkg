import { RegistryClient } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.ts'
import { requireRegistry } from '../require-registry.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

export const needsRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'logout',
    usage: [''],
    description: `Log out of the default registry, deleting the token from
                  the local keychain, as well as destroying it on the server.`,
    options: {
      registry: {
        value: '<url>',
        description: 'Registry URL to log out from.',
      },
      identity: {
        value: '<name>',
        description:
          'Identity namespace used to look up auth tokens.',
      },
    },
  })

export const command: CommandFn<void> = async conf => {
  const rc = new RegistryClient(conf.options)
  await rc.logout(requireRegistry(conf))
}
