import { error } from '@vltpkg/error-cause'
import { deleteToken, setToken } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.ts'
import { readPassword } from '../read-password.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'token',
    usage: ['add', 'rm'],
    description: `Explicitly add or remove tokens in the vlt keychain`,
    options: {
      registry: {
        value: '<url>',
        description: 'Registry URL to manage tokens for.',
      },
      identity: {
        value: '<name>',
        description: 'Identity namespace used to store auth tokens.',
      },
    },
  })

export const command: CommandFn<void> = async conf => {
  const reg = new URL(conf.options.registry).origin
  switch (conf.positionals[0]) {
    case 'add': {
      await setToken(
        reg,
        `Bearer ${await readPassword('Paste bearer token: ')}`,
        conf.options.identity,
      )
      break
    }

    case 'rm': {
      await deleteToken(reg, conf.options.identity)
      break
    }

    default: {
      throw error('Invalid token subcommand', {
        found: conf.positionals[0],
        validOptions: ['add', 'rm'],
        code: 'EUSAGE',
      })
    }
  }
}
