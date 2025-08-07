import {
  get as getConfigValue,
  list as listConfigValues,
} from '@vltpkg/config'

import type { LoadedConfig } from '@vltpkg/cli-sdk/config'

type VltJsonModule = {
  unload: (which?: 'user' | 'project') => void
  load: <T>(
    field: string,
    validator: (x: unknown) => x is T,
    which?: 'user' | 'project',
  ) => T | undefined
}

export class ConfigManager {
  config: LoadedConfig

  constructor({ config }: { config: LoadedConfig }) {
    this.config = config
  }

  list() {
    return listConfigValues(this.config)
  }

  async get(key?: string) {
    let configSection: Record<string, unknown> | undefined

    // Clear vlt-json caches to ensure fresh file reads
    try {
      const { unload, load: vltLoad } = (await import(
        '@vltpkg/vlt-json'
      )) as VltJsonModule
      unload('user')
      unload('project')

      // Read the config section directly from vlt.json
      configSection = vltLoad(
        'config',
        (x: unknown): x is Record<string, unknown> =>
          x != null && typeof x === 'object',
        'project',
      )
      /* c8 ignore next */
    } catch {}

    if (!key) {
      // For full config list, merge fresh vlt-json config with the base config
      const baseConfig = this.list()

      // Overlay fresh vlt-json config values on top of base config
      if (configSection) {
        /* c8 ignore next */
        Object.assign(baseConfig, configSection)
      }

      return baseConfig
    }

    /* c8 ignore next 4 */
    // Check if we have fresh data from vlt-json for this key
    if (configSection && key in configSection) {
      return configSection[key]
    }

    // Fallback to config system value
    // Temporarily set the key as a positional argument for the get function
    const originalPositionals = this.config.positionals
    this.config.positionals = ['config', key]

    try {
      const result = await getConfigValue(this.config)
      return result
    } finally {
      this.config.positionals = originalPositionals
    }
  }

  async set(key: string, value: string) {
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
    const which = freshConfig.get('config')

    // Instead of using setConfigValue (which uses stale jackspeak parser),
    // write directly to config file using addConfigToFile
    const configValues = { [key]: value }
    await freshConfig.addConfigToFile(which, configValues)

    // Config will be reloaded on next get() call
  }

  async delete(key: string) {
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
    const which = freshConfig.get('config')

    // Instead of using delConfigValue (which uses stale jackspeak parser),
    // delete directly from config file using deleteConfigKeys
    await freshConfig.deleteConfigKeys(which, [key])

    // Config will be reloaded on next get() call
  }
}
