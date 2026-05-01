import { error } from '@vltpkg/error-cause'
import {
  deleteToken,
  normalizeRegistryKey,
  RegistryClient,
  setToken,
} from '@vltpkg/registry-client'
import { commandUsage } from '../config/usage.ts'
import { readPassword } from '../read-password.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export type TokenInfo = {
  /** The server-side key/id for the token */
  key: string
  /** A truncated prefix of the token value */
  token: string
  /** ISO date when the token was created */
  created: string
  /** Whether this token is read-only */
  readonly: boolean
  /** CIDR whitelist, if any */
  cidr_whitelist?: string[]
}

export type RegistryTokens = {
  registry: string
  alias?: string
  tokens: TokenInfo[]
  error?: string
}

export type TokenListResult = RegistryTokens[]

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'token',
    usage: ['list', 'add', 'rm'],
    description: `Manage registry authentication tokens in the vlt keychain.`,
    subcommands: {
      list: {
        usage: '',
        description: `List all tokens for configured registries.
                      Queries each registry's token API and displays
                      token metadata including key, creation date,
                      and permissions.`,
      },
      add: {
        usage: '',
        description: `Add a token for the specified registry.
                      You will be prompted to paste the bearer token.`,
      },
      rm: {
        usage: '',
        description: `Remove the stored token for the specified registry.`,
      },
    },
    options: {
      registry: {
        value: '<url>',
        description: 'Registry URL to manage tokens for.',
      },
      registries: {
        value: '<alias=url>',
        description:
          'Named registry aliases (used by the list subcommand).',
      },
      identity: {
        value: '<name>',
        description: 'Identity namespace used to store auth tokens.',
      },
    },
  })

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatTokenEntry = (t: TokenInfo): string => {
  const parts = [
    `key: ${t.key}`,
    `token: ${t.token}…`,
    `created: ${formatDate(t.created)}`,
    `readonly: ${t.readonly ? 'yes' : 'no'}`,
  ]
  if (t.cidr_whitelist && t.cidr_whitelist.length > 0) {
    parts.push(`cidr: ${t.cidr_whitelist.join(', ')}`)
  }
  return parts.join(' │ ')
}

const formatRegistryTokens = (r: RegistryTokens): string => {
  const header = r.alias ? `${r.alias} (${r.registry})` : r.registry
  if (r.error) return `${header}\n  error: ${r.error}`
  if (r.tokens.length === 0) return `${header}\n  (no tokens found)`
  return [
    header,
    ...r.tokens.map(t => `  ${formatTokenEntry(t)}`),
  ].join('\n')
}

export const views = {
  human: (r: TokenListResult | void) => {
    if (!r) return
    return r.map(formatRegistryTokens).join('\n\n')
  },
  json: (r: TokenListResult | void) => {
    if (!r) return
    return r
  },
} as const satisfies Views<TokenListResult | void>

const listTokens = async (
  rc: RegistryClient,
  registry: string,
  alias?: string,
): Promise<RegistryTokens> => {
  const tokensUrl = new URL('-/npm/v1/tokens', registry)
  try {
    const objects = await rc.scroll<TokenInfo>(tokensUrl, {
      useCache: false,
    })
    return {
      registry,
      alias,
      tokens: objects.map(o => ({
        key: o.key,
        token: o.token,
        created: o.created,
        readonly: o.readonly,
        cidr_whitelist: o.cidr_whitelist,
      })),
    }
  } catch (err) {
    return {
      registry,
      alias,
      tokens: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export const command: CommandFn<
  TokenListResult | void
> = async conf => {
  const reg = normalizeRegistryKey(conf.options.registry)
  switch (conf.positionals[0]) {
    case 'list': {
      const rc = new RegistryClient(conf.options)
      const results: RegistryTokens[] = []

      // Always query the default registry first
      results.push(
        await listTokens(rc, conf.options.registry, 'default'),
      )

      // Then query all configured registry aliases
      const registries = conf.options.registries
      for (const [alias, registry] of Object.entries(registries)) {
        // Skip if it's the same as the default registry
        if (registry !== conf.options.registry) {
          results.push(await listTokens(rc, registry, alias))
        }
      }

      return results
    }

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
        validOptions: ['list', 'add', 'rm'],
        code: 'EUSAGE',
      })
    }
  }
}
