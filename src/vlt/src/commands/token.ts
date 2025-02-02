import { deleteToken, setToken } from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.js'
import { readPassword } from '../read-password.js'
import { type CommandFn, type CommandUsage } from '../types.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'token',
    usage: ['add', 'rm'],
    description: `Explicitly add or remove tokens in the vlt keychain`,
  })

export const command: CommandFn = async conf => {
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
      //eslint-disable-next-line no-console
      console.error(usage().usage())
      process.exitCode = 1
    }
  }
}
