import assert from 'node:assert'
import * as dotProp from '@vltpkg/dot-prop'
import { error } from '@vltpkg/error-cause'
import { commandUsage } from '../config/usage.ts'
import { get, set, edit, list, del } from '@vltpkg/config'
import { load, find } from '@vltpkg/vlt-json'
import type { LoadedConfig, RecordPairs } from '../config/index.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { Views } from '../view.ts'

// Type for the CLI config option (includes 'all' for merged config)
type ConfigOption = 'all' | 'user' | 'project'

export const views: Views = {
  human: results => {
    // Handle string arrays (like list output)
    if (Array.isArray(results) && typeof results[0] === 'string') {
      return results.join('\n')
    }

    // For all other values (primitives, objects, arrays), use JSON formatting like vlt pkg
    return JSON.stringify(results, null, 2)
  },
} as const satisfies Views

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'config',
    usage: '[<command>] [<args>]',
    description: 'Get or manipulate vlt configuration values',

    subcommands: {
      get: {
        usage: '[<key>] [--config=<all | user | project>]',
        description:
          'Get a single config value. Use --config to specify which config to read from.',
      },

      pick: {
        usage:
          '[<key> [<key> ...]] [--config=<all | user | project>]',
        description:
          'Get multiple config values or all configuration. Use --config to specify which config to read from.',
      },

      list: {
        usage: '[--config=<all | user | project>]',
        description:
          'Print configuration settings. --config=all shows merged config (default), --config=user shows only user config, --config=project shows only project config.',
      },

      set: {
        usage:
          '<key>=<value> [<key>=<value> ...] [--config=<all | user | project>]',
        description: `Set config values. By default (or with --config=all), these are
                      written to the project config file, \`vlt.json\`
                      in the root of the project. To set things for all
                      projects, run with \`--config=user\`.`,
      },

      delete: {
        usage: '<key> [<key> ...] [--config=<all | user | project>]',
        description: `Delete the named config fields. If no values remain in
                      the config file, delete the file as well. By default
                      (or with --config=all), operates on the \`vlt.json\` file in
                      the root of the current project. To delete a config field from
                      the user config file, specify \`--config=user\`.`,
      },

      edit: {
        usage: '[--config=<all | user | project>]',
        description:
          'Edit the configuration file. By default (or with --config=all), edits the project config file.',
      },

      location: {
        usage: '[--config=<user | project>]',
        description:
          'Show the file path of the configuration file. Defaults to project config.',
      },
    },
  })

export const command: CommandFn = async conf => {
  const [sub] = conf.positionals

  assert(
    sub,
    error('config command requires a subcommand', {
      code: 'EUSAGE',
      validOptions: [
        'get',
        'pick',
        'set',
        'delete',
        'list',
        'edit',
        'location',
      ],
    }),
  )

  switch (sub) {
    case 'set':
      return configSet(conf)

    case 'get':
      return configGet(conf)

    case 'pick':
      return configPick(conf)

    case 'ls':
    case 'list':
      return configList(conf)

    case 'edit':
      return configEdit(conf)

    case 'location':
      return configLocation(conf)

    case 'del':
    case 'delete':
    case 'rm':
    case 'remove':
    case 'unset':
      return configDelete(conf)

    default: {
      throw error('Unrecognized config command', {
        code: 'EUSAGE',
        found: sub,
        validOptions: [
          'get',
          'pick',
          'set',
          'delete',
          'list',
          'edit',
          'location',
        ],
      })
    }
  }
}

// Enhanced get function that supports multiple keys (falls back to pick behavior)
const configGet = async (conf: LoadedConfig): Promise<unknown> => {
  const keys = conf.positionals.slice(1)
  const configOption = conf.get('config') as ConfigOption

  // If no keys provided, show all config (like pkg get with no args)
  if (keys.length === 0) {
    return configPick(conf)
  }

  // If exactly one key, get the value based on --config option
  if (keys.length === 1) {
    const key = keys[0]
    if (!key) {
      throw error('Key is required', { code: 'EUSAGE' })
    }

    switch (configOption) {
      case 'all': {
        // Default behavior - get from merged/consolidated config (like original get function)
        const result = await get(conf)
        return result
      }
      case 'user': {
        return getUserConfigValue(key)
      }
      case 'project': {
        return getProjectConfigValue(key)
      }
      default: {
        // Fallback to merged config
        const result = await get(conf)
        return result
      }
    }
  }

  // Multiple keys: use pick behavior
  return configPick(conf)
}

// New pick function for getting multiple config values (like vlt pkg pick)
const configPick = async (conf: LoadedConfig) => {
  const keys = conf.positionals.slice(1)
  const configOption = conf.get('config') as ConfigOption

  // If no keys provided, return entire config object based on --config option (like vlt pkg pick)
  if (keys.length === 0) {
    switch (configOption) {
      case 'all':
        // For 'all', return the merged config as a serializable object
        return getSerializableConfig(conf)

      case 'user': {
        // Return entire user config object
        const userConfig = getUserConfigObject()
        return userConfig /* c8 ignore next */ ?? {}
      }

      case 'project': {
        // Return entire project config object
        const projectConfig = getProjectConfigObject()
        return projectConfig /* c8 ignore next */ ?? {}
      }
    }
  }

  // Multiple keys: build an object with the requested keys (like vlt pkg pick)
  const result: Record<string, unknown> = {}

  for (const key of keys) {
    if (!key) /* c8 ignore next */ continue

    switch (configOption) {
      case 'all':
        // Get from merged config (default behavior)
        result[key] = await get(
          Object.assign(
            Object.create(Object.getPrototypeOf(conf) as object),
            conf,
            {
              positionals: ['get', key],
            },
          ) as LoadedConfig,
        )
        break

      case 'user':
        result[key] = getUserConfigValue(key)
        break

      case 'project':
        result[key] = getProjectConfigValue(key)
        break
    }
  }

  return result
}

// Enhanced list function that respects --config option
const configList = (conf: LoadedConfig) => {
  const configOption = conf.get('config') as ConfigOption

  switch (configOption) {
    case 'all':
      // Default behavior - show merged config
      return list(conf)

    case 'user':
      // Show only user config
      return getUserConfigList()

    case 'project':
      // Show only project config
      return getProjectConfigList()

    default:
      // Fallback to merged config
      return list(conf)
  }
}

// Convert RecordPairs to string array in key=value format
const configToStringArray = (config: RecordPairs): string[] => {
  const result: string[] = []

  for (const [key, value] of Object.entries(config)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      // Handle array values (like registries)
      for (const item of value) {
        if (typeof item === 'string') {
          result.push(`${key}=${item}`)
        }
      }
    } else if (typeof value === 'object') {
      // Handle object values
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue !== undefined && subValue !== null) {
          result.push(`${key}.${subKey}=${String(subValue)}`)
        }
      }
    } else {
      // Handle primitive values
      let stringValue: string
      if (typeof value === 'string') {
        stringValue = value
      } else if (
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        stringValue = String(value)
      } else {
        stringValue = '[object]'
      }
      result.push(`${key}=${stringValue}`)
    }
  }

  return result.sort()
}

// Get user config as key=value pairs
const getUserConfigList = (): string[] => {
  try {
    const userConfig = load(
      'config',
      (x: unknown, file: string): asserts x is RecordPairs => {
        if (
          x !== null &&
          typeof x === 'object' &&
          !Array.isArray(x)
        ) {
          return
        }
        throw new Error(`Invalid config in ${file}`)
      },
      'user',
    )

    if (!userConfig) return /* c8 ignore next */ []

    return configToStringArray(userConfig)
  } catch (_err) {
    return []
  }
}

// Get project config as key=value pairs
const getProjectConfigList = (): string[] => {
  try {
    const projectConfig = load(
      'config',
      (x: unknown, file: string): asserts x is RecordPairs => {
        if (
          x !== null &&
          typeof x === 'object' &&
          !Array.isArray(x)
        ) {
          return
        }
        throw new Error(`Invalid config in ${file}`)
      },
      'project',
    )

    if (!projectConfig) return /* c8 ignore next */ []

    return configToStringArray(projectConfig)
  } catch (_err) {
    return []
  }
}

// Get the entire user config object
const getUserConfigObject = ():
  | Record<string, unknown>
  | undefined => {
  try {
    const userConfig = load(
      'config',
      (x: unknown, file: string): asserts x is RecordPairs => {
        if (
          x !== null &&
          typeof x === 'object' &&
          !Array.isArray(x)
        ) {
          return
        }
        throw new Error(`Invalid config in ${file}`)
      },
      'user',
    )

    if (!userConfig || typeof userConfig !== 'object')
      /* c8 ignore next */
      return

    return userConfig as Record<string, unknown>
  } catch (_err) {
    return
  }
}

// Get a specific value from user config
const getUserConfigValue = (key: string): unknown => {
  const userConfig = getUserConfigObject()
  if (!userConfig) return

  // Use dotProp.get like vlt pkg get does
  return dotProp.get(userConfig as Record<PropertyKey, unknown>, key)
}

// Get the entire project config object
const getProjectConfigObject = ():
  | Record<string, unknown>
  | undefined => {
  try {
    const projectConfig = load(
      'config',
      (x: unknown, file: string): asserts x is RecordPairs => {
        if (
          x !== null &&
          typeof x === 'object' &&
          !Array.isArray(x)
        ) {
          return
        }
        throw new Error(`Invalid config in ${file}`)
      },
      'project',
    )

    if (!projectConfig || typeof projectConfig !== 'object')
      /* c8 ignore next */
      return

    return projectConfig as Record<string, unknown>
  } catch (_err) {
    return
  }
}

// Get a specific value from project config
const getProjectConfigValue = (key: string): unknown => {
  const projectConfig = getProjectConfigObject()
  if (!projectConfig) return

  // Use dotProp.get like vlt pkg get does
  return dotProp.get(
    projectConfig as Record<PropertyKey, unknown>,
    key,
  )
}

// Helper function to get the effective config option for write operations
const getWriteConfigOption = (
  conf: LoadedConfig,
): 'user' | 'project' => {
  const configOption = conf.get('config') as ConfigOption

  if (configOption === 'all') {
    // For write operations, 'all' defaults to 'project'
    return 'project'
  }

  return configOption
}

// Wrapper for set command that handles --config option appropriately
const configSet = async (conf: LoadedConfig) => {
  const effectiveConfig = getWriteConfigOption(conf)

  // Temporarily modify the config value for the set operation
  const originalGet = conf.get
  conf.get = ((key: string) => {
    if (key === 'config') {
      return effectiveConfig
    }
    return originalGet.call(conf, key as any)
  }) as typeof originalGet

  try {
    return await set(conf)
  } finally {
    // Restore the original get method
    conf.get = originalGet
  }
}

// Wrapper for delete command that handles --config option appropriately
const configDelete = async (conf: LoadedConfig) => {
  const effectiveConfig = getWriteConfigOption(conf)

  // Temporarily modify the config value for the delete operation
  const originalGet = conf.get
  conf.get = ((key: string) => {
    if (key === 'config') {
      return effectiveConfig
    }
    return originalGet.call(conf, key as any)
  }) as typeof originalGet

  try {
    return await del(conf)
  } finally {
    // Restore the original get method
    conf.get = originalGet
  }
}

// Wrapper for edit command that handles --config option appropriately
const configEdit = async (conf: LoadedConfig) => {
  const effectiveConfig = getWriteConfigOption(conf)

  // Temporarily modify the config value for the edit operation
  const originalGet = conf.get
  conf.get = ((key: string) => {
    if (key === 'config') {
      return effectiveConfig
    }
    return originalGet.call(conf, key as any)
  }) as typeof originalGet

  try {
    return await edit(conf)
  } finally {
    // Restore the original get method
    conf.get = originalGet
  }
}

// Get a serializable config object from LoadedConfig (without circular references)
const getSerializableConfig = (
  conf: LoadedConfig,
): Record<string, unknown> => {
  // Use the list function which calls recordsToPairs to get a clean config object
  return list(conf) as Record<string, unknown>
}

// Location command that shows config file paths
const configLocation = (conf: LoadedConfig): string => {
  const configOption = conf.get('config') as ConfigOption

  // For location command, default to 'project' when 'all' is specified
  // since there's no single "all" file to show
  const effectiveConfig =
    configOption === 'all' ? 'project' : configOption

  // Get the config file path
  const configPath = find(effectiveConfig)

  return configPath
}
