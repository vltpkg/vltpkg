import {
  get as getConfigValue,
  list as listConfigValues,
} from '@vltpkg/config'

import type { LoadedConfig } from '@vltpkg/cli-sdk/config'
import type { WhichConfig } from '@vltpkg/vlt-json'

type VltJsonModule = {
  unload: (which?: 'user' | 'project') => void
  load: <T>(
    field: string,
    validator: (x: unknown) => x is T,
    which?: 'user' | 'project',
  ) => T | undefined
  find: (
    which?: 'user' | 'project',
    cwd?: string,
    home?: string,
  ) => string
}

export class ConfigManager {
  config: LoadedConfig

  constructor({ config }: { config: LoadedConfig }) {
    this.config = config
  }

  list() {
    return listConfigValues(this.config)
  }

  async get(key?: string, which?: WhichConfig) {
    let configSection: Record<string, unknown> | undefined

    // Clear vlt-json caches to ensure fresh file reads
    try {
      const {
        unload,
        load: vltLoad,
        find: vltFind,
      } = (await import('@vltpkg/vlt-json')) as VltJsonModule

      unload('user')
      unload('project')

      // Ensure vlt-json resolves the project vlt.json using our known root
      if (!which || which === 'project') {
        /* c8 ignore next */
        try {
          vltFind('project', this.config.projectRoot)
          /* c8 ignore next */
        } catch {}
      }

      // Read the config section directly from vlt.json
      configSection = vltLoad(
        'config',
        (x: unknown): x is Record<string, unknown> =>
          x != null && typeof x === 'object',
        which ?? 'project',
      )
      /* c8 ignore next */
    } catch {}

    if (!key) {
      // If a specific config is requested, return that config
      /* c8 ignore next 3 */
      if (which) {
        return configSection ?? {}
      }
      // otherwise return merged config view
      const baseConfig = this.list()

      /* c8 ignore next 3 */
      if (configSection) {
        Object.assign(baseConfig, configSection)
      }
      return baseConfig
    }

    /* c8 ignore next 4 */
    // Check if we have fresh data from vlt-json for this key
    if (configSection && key in configSection) {
      return configSection[key]
    }

    // If a specific config file was requested, do not fallback beyond that
    if (which) return undefined

    // Fallback to config system value when no specific "which" is requested
    const originalPositionals = this.config.positionals
    this.config.positionals = ['config', key]
    try {
      const result = await getConfigValue(this.config)
      return result
    } finally {
      this.config.positionals = originalPositionals
    }
  }

  async setValues(
    values: Record<string, string | string[]>,
    which?: WhichConfig,
  ) {
    // Clear vlt-json caches to ensure fresh file reads
    try {
      const { unload } = (await import(
        '@vltpkg/vlt-json'
      )) as VltJsonModule
      unload('user')
      unload('project')
      /* c8 ignore next */
    } catch {}

    // Create a fresh config instance for the set operation to avoid cache issues
    const { Config } = await import('@vltpkg/cli-sdk/config')
    const freshConfig = await Config.load(
      this.config.projectRoot,
      process.argv,
      true,
    )

    // Get which config file to write to (user or project)
    const selected: WhichConfig = which ?? freshConfig.get('config')

    // Instead of using setConfigValue (which uses stale jackspeak parser),
    // write directly to config file using addConfigToFile
    await freshConfig.addConfigToFile(selected, values)

    // Config will be reloaded on next get() call
  }

  async setPairs(
    pairs: { key: string; value: string }[],
    which?: WhichConfig,
  ) {
    const entries: [string, string | string[]][] = pairs.map(
      ({ key, value }) => {
        try {
          const parsed: unknown = JSON.parse(value)
          /* c8 ignore next 4 */
          if (
            Array.isArray(parsed) &&
            parsed.every((v: unknown) => typeof v === 'string')
          ) {
            return [key, parsed]
          }
        } catch {}
        /* c8 ignore next */
        return [key, value]
      },
    )
    const values: Record<string, string | string[]> =
      Object.fromEntries(entries)
    return this.setValues(values, which)
  }

  async set(key: string, value: string, which?: WhichConfig) {
    return this.setValues({ [key]: value }, which)
  }

  async delete(key: string, which?: WhichConfig) {
    return this.deleteMany([key], which)
  }

  async deleteMany(keys: string[], which?: WhichConfig) {
    // Clear vlt-json caches to ensure fresh file reads
    try {
      const { unload } = (await import(
        '@vltpkg/vlt-json'
      )) as VltJsonModule
      unload('user')
      unload('project')
      /* c8 ignore next */
    } catch {}

    // Create a fresh config instance for the delete operation to avoid cache issues
    const { Config } = await import('@vltpkg/cli-sdk/config')
    const freshConfig = await Config.load(
      this.config.projectRoot,
      [],
      true,
    )

    // Get which config file to write to (user or project)
    const selected: WhichConfig = which ?? freshConfig.get('config')

    // Instead of using delConfigValue (which uses stale jackspeak parser),
    // delete directly from config file using deleteConfigKeys
    await freshConfig.deleteConfigKeys(selected, keys)

    // Config will be reloaded on next get() call
  }
}
