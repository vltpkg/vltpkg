import { RegistryClient } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.js'
import { type CliCommandFn, type CliCommandUsage } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'login',
    usage: [''],
    description: `Authenticate against a registry, and store the token in
                  the appropriate config file for later use.`,
  })

export const command: CliCommandFn = async conf => {
  const rc = new RegistryClient(conf.options)
  await rc.login(conf.options.registry)
}
