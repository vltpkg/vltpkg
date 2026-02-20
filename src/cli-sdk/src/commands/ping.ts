import { RegistryClient } from '@vltpkg/registry-client'
import { error } from '@vltpkg/error-cause'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'ping',
    usage: ['', '[<registry-alias>]'],
    description: `Ping configured registries to verify connectivity
                  and check registry health.

                  By default, pings all configured registries including
                  the default registry.

                  If a registry alias is provided, ping only that specific
                  registry. Registry aliases are configured via the
                  \`registries\` field in vlt.json or with the
                  \`--registries\` option.`,
  })

type PingResult = {
  registry: string
  alias?: string
  status: 'ok' | 'error'
  time: number
  statusCode?: number
  error?: string
}

type CommandResult = PingResult | PingResult[]

const formatPingResult = (r: PingResult): string => {
  const prefix = r.alias ? `${r.alias} (${r.registry})` : r.registry
  if (r.status === 'ok') {
    return `Ping successful: ${prefix} (${r.time}ms)`
  } else {
    return `Ping failed: ${prefix} - ${r.error}`
  }
}

export const views = {
  human: r => {
    if (Array.isArray(r)) {
      return r.map(formatPingResult).join('\n')
    }
    return formatPingResult(r)
  },
  json: r => r,
} as const satisfies Views<CommandResult>

const pingRegistry = async (
  rc: RegistryClient,
  registry: string,
  alias?: string,
): Promise<PingResult> => {
  const url = new URL('-/ping?write=true', registry)
  const start = Date.now()

  try {
    const response = await rc.request(url, { useCache: false })
    const time = Date.now() - start

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return {
        registry,
        alias,
        status: 'ok',
        time,
        statusCode: response.statusCode,
      }
    } else {
      return {
        registry,
        alias,
        status: 'error',
        time,
        statusCode: response.statusCode,
        error: `Registry returned status ${response.statusCode}`,
      }
    }
  } catch (err) {
    const time = Date.now() - start
    return {
      registry,
      alias,
      status: 'error',
      time,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export const command: CommandFn<CommandResult> = async conf => {
  const rc = new RegistryClient(conf.options)
  const registryAlias = conf.positionals[0]

  if (registryAlias) {
    // Ping a specific registry by alias
    const registries = conf.options.registries
    const registry = registries[registryAlias]
    if (!registry) {
      const availableAliases = Object.keys(registries)
      throw error('Unknown registry alias', {
        found: registryAlias,
        wanted:
          availableAliases.length > 0 ? availableAliases : undefined,
      })
    }
    return await pingRegistry(rc, registry, registryAlias)
  } else {
    // Ping all configured registries
    const registries = conf.options.registries
    const results: PingResult[] = []

    // Always ping the default registry first
    results.push(
      await pingRegistry(rc, conf.options.registry, 'default'),
    )

    // Then ping all configured registry aliases
    for (const [alias, registry] of Object.entries(registries)) {
      // Skip if it's the same as the default registry
      if (registry !== conf.options.registry) {
        results.push(await pingRegistry(rc, registry, alias))
      }
    }

    return results
  }
}
