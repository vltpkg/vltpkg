import { error } from '@vltpkg/error-cause'
import { RegistryClient } from '@vltpkg/registry-client'
import type { JSONField } from '@vltpkg/types'
import type { LoadedConfig } from '../config/index.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'profile',
    usage: '<command> [<args>]',
    description: `Get or set profile properties for the authenticated user
                  on the configured registry.`,
    subcommands: {
      get: {
        usage: '[<property>]',
        description:
          'Display profile information. Optionally pass a property name to get a single value.',
      },
      set: {
        usage: '<property> <value>',
        description: 'Set a profile property to the given value.',
      },
    },
    options: {
      registry: {
        value: '<url>',
        description: 'Registry URL to query for profile info.',
      },
      identity: {
        value: '<name>',
        description:
          'Identity namespace used to look up auth tokens.',
      },
      otp: {
        description:
          'Provide an OTP to use when updating profile properties.',
        value: '<otp>',
      },
    },
  })

export type ProfileData = Record<string, JSONField>

export type ProfileResult =
  | ProfileData
  | { property: string; value: JSONField }

const stringify = (v: JSONField): string =>
  typeof v === 'string' ? v
  : typeof v === 'number' || typeof v === 'boolean' ? `${v}`
  : v === null ? 'null'
  : JSON.stringify(v)

export const views = {
  human: result => {
    if ('property' in result) {
      return stringify(result.value)
    }
    return Object.entries(result)
      .map(([k, v]) => `${k}: ${stringify(v)}`)
      .join('\n')
  },
  json: r => r,
} as const satisfies Views<ProfileResult>

export const command: CommandFn<ProfileResult> = async conf => {
  const [sub, ...args] = conf.positionals
  switch (sub) {
    case 'get':
      return getProfile(conf, args)
    case 'set':
      return setProfile(conf, args)
    default: {
      throw error('Invalid profile subcommand', {
        found: sub,
        validOptions: ['get', 'set'],
        code: 'EUSAGE',
      })
    }
  }
}

const getProfile = async (
  conf: LoadedConfig,
  args: string[],
): Promise<ProfileResult> => {
  const rc = new RegistryClient(conf.options)
  const registryUrl = new URL(conf.options.registry)
  const url = new URL('-/npm/v1/user', registryUrl)
  const response = await rc.request(url, { useCache: false })
  const data = response.json()

  const [property] = args
  if (property) {
    if (!(property in data)) {
      throw error('Property not found in profile', {
        found: property,
        validOptions: Object.keys(data),
        code: 'EUSAGE',
      })
    }
    return { property, value: data[property] }
  }
  return data
}

const setProfile = async (
  conf: LoadedConfig,
  args: string[],
): Promise<ProfileResult> => {
  const [property, ...rest] = args
  const value = rest.join(' ')
  if (!property || !value) {
    throw error('set requires a property name and value', {
      code: 'EUSAGE',
    })
  }
  const rc = new RegistryClient(conf.options)
  const registryUrl = new URL(conf.options.registry)
  const url = new URL('-/npm/v1/user', registryUrl)
  const response = await rc.request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ [property]: value }),
    otp: conf.options.otp,
    useCache: false,
  })
  const data = response.json()
  return { property, value: data[property] }
}
