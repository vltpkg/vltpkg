import { error } from '@vltpkg/error-cause'
import {
  deleteToken,
  getKC,
  getToken,
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
  /** Masked local keychain token, if stored */
  localToken?: string
  tokens: TokenInfo[]
  error?: string
}

export type TokenListResult = {
  identity: string
  registries: RegistryTokens[]
}

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'token',
    usage: ['list', 'add', 'rm'],
    description: `Manage registry authentication tokens in the vlt keychain.`,
    subcommands: {
      list: {
        usage: '',
        description: `List tokens for configured registries. Shows
                      locally stored auth tokens and queries each
                      registry's token API for remote token metadata.`,
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

const maskToken = (token: string): string => {
  const bare = token.replace(/^(Bearer|Basic)\s+/i, '')
  if (bare.length <= 8) return bare + '…'
  return bare.slice(0, 8) + '…'
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
  const lines: string[] = [header]
  lines.push(
    `  local: ${r.localToken ? maskToken(r.localToken) : '(none)'}`,
  )
  if (!r.localToken) {
    lines.push('  (skipped remote query — no auth token)')
  } else if (r.error) {
    lines.push(`  error: ${r.error}`)
  } else if (r.tokens.length === 0) {
    lines.push('  (no remote tokens found)')
  } else {
    for (const t of r.tokens) {
      lines.push(`  ${formatTokenEntry(t)}`)
    }
  }
  return lines.join('\n')
}

export const views = {
  human: (r: TokenListResult | void) => {
    if (!r) return
    const header =
      r.identity ? `identity: ${r.identity}` : 'identity: (default)'
    return [header, ...r.registries.map(formatRegistryTokens)].join(
      '\n\n',
    )
  },
  json: (r: TokenListResult | void) => {
    if (!r) return
    return r
  },
} as const satisfies Views<TokenListResult | void>

const listTokens = async (
  rc: RegistryClient,
  registry: string,
  identity: string,
  alias?: string,
): Promise<RegistryTokens> => {
  const localTok = await getToken(
    normalizeRegistryKey(registry),
    identity,
  )
  if (!localTok) {
    return { registry, alias, tokens: [] }
  }
  const tokensUrl = new URL('-/npm/v1/tokens', registry)
  try {
    const objects = await rc.scroll<TokenInfo>(tokensUrl, {
      useCache: false,
    })
    return {
      registry,
      alias,
      localToken: localTok,
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
      localToken: localTok,
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
      const identity = conf.options.identity
      const registries: RegistryTokens[] = []
      const seen = new Set<string>()

      // Always query the default registry first
      const defaultReg = conf.options.registry
      seen.add(normalizeRegistryKey(defaultReg))
      registries.push(
        await listTokens(rc, defaultReg, identity, 'default'),
      )

      // Then query all configured registry aliases
      const configuredRegistries = conf.options.registries
      for (const [alias, registry] of Object.entries(
        configuredRegistries,
      )) {
        const key = normalizeRegistryKey(registry)
        if (!seen.has(key)) {
          seen.add(key)
          registries.push(
            await listTokens(rc, registry, identity, alias),
          )
        }
      }

      // Also show any keychain entries for registries not
      // already covered (e.g. added via `vlt token add --registry`)
      const kc = getKC(identity)
      for (const key of await kc.keys()) {
        if (!seen.has(key)) {
          seen.add(key)
          const tok = await kc.get(key)
          registries.push({
            registry: key,
            localToken: tok ?? undefined,
            tokens: [],
          })
        }
      }

      return { identity, registries }
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
