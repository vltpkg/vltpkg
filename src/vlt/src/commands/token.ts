import { deleteToken, setToken } from '@vltpkg/registry-client'
import { PassThrough } from 'stream'
import { commandUsage } from '../config/usage.js'
import { readPassword } from '../read-password.js'
import { type CliCommandFn, type CliCommandUsage } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'token',
    usage: ['add', 'rm'],
    description: `Explicitly add or remove tokens in the vlt keychain`,
  })

const nullWrite = new PassThrough()
nullWrite.resume()

export const command: CliCommandFn = async conf => {
  const reg = new URL(conf.options.registry).origin
  switch (conf.positionals[0]) {
    case 'add': {
      await setToken(
        reg,
        `Bearer ${await readPassword('Paste bearer token: ')}`,
      )
      break
    }

    case 'rm': {
      await deleteToken(reg)
      break
    }

    default: {
      //eslint-disable-next-line no-console
      console.error(usage().usage())
      process.exitCode = 1
    }
  }
}
