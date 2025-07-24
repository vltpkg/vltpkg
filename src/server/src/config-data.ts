import {
  get as getConfigValue,
  set as setConfigValue,
  del as delConfigValue,
  list as listConfigValues,
} from '@vltpkg/config'

import type { LoadedConfig } from '@vltpkg/cli-sdk/config'

export class ConfigManager {
  config: LoadedConfig

  constructor({ config }: { config: LoadedConfig }) {
    this.config = config
  }

  list() {
    return listConfigValues(this.config)
  }

  async get(key?: string) {
    if (!key) {
      return this.list()
    }

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
    const pair = `${key}=${value}`
    const originalPositionals = this.config.positionals
    this.config.positionals = ['config', pair]

    try {
      await setConfigValue(this.config)
    } finally {
      this.config.positionals = originalPositionals
    }
  }

  async delete(key: string) {
    const originalPositionals = this.config.positionals
    this.config.positionals = ['config', key]

    try {
      await delConfigValue(this.config)
    } finally {
      this.config.positionals = originalPositionals
    }
  }

  async update(key: string, value: string) {
    await this.set(key, value)
  }
}
