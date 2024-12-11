import { RegistryClient } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.js'
import { type CommandFn, type CommandUsage } from '../types.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'login',
    usage: [''],
    description: `Authenticate against a registry, and store the token in
                  the appropriate config file for later use.`,
  })

export const command: CommandFn = async conf => {
  const rc = new RegistryClient(conf.options)
  await rc.login(conf.options.registry)
}
