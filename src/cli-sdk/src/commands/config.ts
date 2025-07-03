import { error } from '@vltpkg/error-cause'
import * as dotProp from '@vltpkg/dot-prop'
import { asRootError } from '@vltpkg/output/error'
import { isObject } from '@vltpkg/types'
import { spawnSync } from 'node:child_process'
import { getSortedKeys } from '../config/definition.ts'
import type {
  ConfigDefinitions,
  LoadedConfig,
  RecordPairs,
} from '../config/index.ts'
import {
  definition,
  isRecordField,
  pairsToRecords,
  recordsToPairs,
} from '../config/index.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'config',
    usage: '<command> [flags]',
    description: 'Work with vlt configuration',

    subcommands: {
      get: {
        usage: '<key> [<key> ...]',
        description: 'Print the named config value',
      },

      list: {
        description:
          'Print all configuration settings currently in effect',
      },

      set: {
        usage:
          '<key>=<value> [<key>=<value> ...] [--config=<user | project>]',
        description: `Set config values. By default, these are
                      written to the project config file, \`vlt.json\`
                      in the root of the project. To set things for all
                      projects, run with \`--config=user\``,
      },

      del: {
        usage: '<key> [<key> ...] [--config=<user | project>]',
        description: `Delete the named config fields. If no values remain in
                      the config file, delete the file as well. By default,
                      operates on the \`vlt.json\` file in the root of the
                      current project. To delete a config field from the user
                      config file, specify \`--config=user\`.`,
      },

      edit: {
        usage: '[--config=<user | project>]',
        description: 'Edit the configuration file',
      },

      help: {
        usage: '[field ...]',
        description: `Get information about a config field, or show a list
                      of known config field names.`,
      },
    },
    examples: {
      'set "registries.local=http://localhost:1337"': {
        description: 'Set a nested registry configuration',
      },
      'get registries.local': {
        description: 'Get a nested registry configuration',
      },
      'del registries.local': {
        description: 'Delete a nested registry configuration',
      },
    },
  })

export const command: CommandFn<
  string | number | boolean | void | string[] | RecordPairs
> = async conf => {
  const sub = conf.positionals[0]
  switch (sub) {
    case 'set':
      return set(conf)

    case 'get':
      return get(conf)

    case 'ls':
    case 'list':
      return list(conf)

    case 'edit':
      return edit(conf)

    case 'help':
      return help(conf)

    case 'del':
      return del(conf)

    default: {
      throw error('Unrecognized config command', {
        code: 'EUSAGE',
        found: sub,
        validOptions: ['set', 'get', 'list', 'edit', 'help', 'del'],
      })
    }
  }
}

const help = (conf: LoadedConfig) => {
  const j = definition.toJSON()
  const fields = conf.positionals.slice(1)
  if (!fields.length) {
    return [
      'Specify one or more options to see information:',
      ...Object.keys(j)
        .sort((a, b) => a.localeCompare(b, 'en'))
        .map(c => `  ${c}`),
    ].join('\n')
  }

  // TODO: some kind of fuzzy search?
  const res: string[] = []
  for (const f of fields) {
    const def = j[f]
    if (!def) {
      res.push(`unknown config field: ${f}`)
    } else {
      const hint = def.hint ? `=<${def.hint}>` : ''
      const type =
        isRecordField(f) ?
          'Record<string, string>'
        : def.type + (def.multiple ? '[]' : '')

      res.push(`--${f}${hint}`)
      res.push(`  type: ${type}`)
      if (def.default) {
        res.push(`  default: ${JSON.stringify(def.default)}`)
      }
      if (def.description) {
        res.push(def.description)
      }
    }
  }
  return res.join('\n')
}

const list = (conf: LoadedConfig) => {
  return recordsToPairs(conf.options)
}

const del = async (conf: LoadedConfig) => {
  const fields = conf.positionals.slice(1)
  if (!fields.length) {
    throw error('At least one key is required', {
      code: 'EUSAGE',
    })
  }

  // Use the existing deleteConfigKeys method - it already handles basic dot notation
  // for record fields like registries.local
  await conf.deleteConfigKeys(conf.get('config'), fields)
}

const get = async (
  conf: LoadedConfig,
): Promise<string | number | boolean | string[] | undefined> => {
  const keys = conf.positionals.slice(1)
  const k = keys[0]
  if (!k || keys.length > 1) {
    throw error('Exactly one key is required', {
      code: 'EUSAGE',
    })
  }

  // Check if this is a dot-prop path into a record field
  if (k.includes('.')) {
    const [field, ...rest] = k.split('.')
    const subKey = rest.join('.')
    
    if (!field || !subKey) {
      return undefined
    }
    
    // Check if the field is a record field (like registries)
    if (isRecordField(field)) {
      const record = conf.getRecord(field as any)
      return dotProp.get(record, subKey) as string | number | boolean | string[] | undefined
    }
    
    // For non-record fields, try to get the value directly
    const value = conf.get(field as keyof ConfigDefinitions)
    if (value && typeof value === 'object') {
      return dotProp.get(value, subKey) as string | number | boolean | string[] | undefined
    }
    
    return undefined
  }

  // Fall back to the existing implementation for simple keys
  return conf.get(k as keyof ConfigDefinitions)
}

const edit = async (conf: LoadedConfig) => {
  const [command, ...args] = conf.get('editor').split(' ')
  if (!command) {
    throw error(`editor is empty`)
  }
  await conf.editConfigFile(conf.get('config'), file => {
    args.push(file)
    const res = spawnSync(command, args, {
      stdio: 'inherit',
    })
    if (res.status !== 0) {
      throw error(`${command} command failed`, {
        ...res,
        command,
        args,
      })
    }
  })
}

const set = async (conf: LoadedConfig) => {
  const pairs = conf.positionals.slice(1)
  if (!pairs.length) {
    // Create an empty config file
    await conf.addConfigToFile(conf.get('config'), {})
    return
  }

  const which = conf.get('config')

  // Separate dot-prop paths from simple keys for different handling
  const dotPropPairs: { key: string; field: string; subKey: string; value: string }[] = []
  const simplePairs: string[] = []

  for (const pair of pairs) {
    const eq = pair.indexOf('=')
    if (eq === -1) {
      throw error('set arguments must contain `=`', {
        code: 'EUSAGE',
      })
    }

    const key = pair.substring(0, eq)
    const value = pair.substring(eq + 1)
    
    if (key.includes('.')) {
      const [field, ...rest] = key.split('.')
      const subKey = rest.join('.')
      if (subKey) {
        dotPropPairs.push({ key, field, subKey, value })
      } else {
        simplePairs.push(pair)
      }
    } else {
      simplePairs.push(pair)
    }
  }

  // Handle simple keys with the original jackspeak parsing approach
  if (simplePairs.length > 0) {
    try {
      const parsed = conf.jack.parseRaw(
        simplePairs.map(kv => `--${kv}`),
      ).values
      await conf.addConfigToFile(which, pairsToRecords(parsed))
    } catch (er) {
      const { name, found, value: errorValue, wanted, validOptions } =
        asRootError(er).cause
      // when a boolean gets a value, it throw a parse error
      if (
        isObject(found) &&
        typeof found.name === 'string' &&
        typeof found.value === 'string'
      ) {
        const { name, value } = found
        throw error(
          `Boolean flag must be "${name}" or "no-${name}", not a value`,
          {
            code: 'ECONFIG',
            name,
            found: `${name}=${value}`,
          },
        )
      }
      if (wanted && !errorValue && typeof name === 'string') {
        throw error(
          `No value provided for ${JSON.stringify(name.replace(/^-+/, ''))}`,
          {
            code: 'ECONFIG',
            wanted,
          },
        )
      }
      if (Array.isArray(validOptions)) {
        throw error(`Invalid value provided for ${name}`, {
          code: 'ECONFIG',
          found,
          validOptions,
        })
      }
      // an unknown property
      throw error('Invalid config keys', {
        code: 'ECONFIG',
        found: simplePairs.map(kv => kv.split('=')[0]),
        validOptions: getSortedKeys(),
      })
    }
  }

  // Handle dot-prop paths for record fields
  if (dotPropPairs.length > 0) {
    for (const { field, subKey, value } of dotPropPairs) {
      if (isRecordField(field)) {
        // For record fields, we add entries in the format field=key=value
        const recordPair = `${field}=${subKey}=${value}`
        try {
          const parsed = conf.jack.parseRaw([`--${recordPair}`]).values
          await conf.addConfigToFile(which, pairsToRecords(parsed))
        } catch (er) {
          // If it fails, it might be an unknown field, so just set it as a direct key=value
          const directPair = `${field}=${subKey}=${value}`
          await conf.addConfigToFile(which, { [field]: [directPair] })
        }
      } else {
        // For non-record fields, we can't use dot-prop directly, so treat as unknown key
        throw error('Invalid config keys', {
          code: 'ECONFIG',
          found: [field],
          validOptions: getSortedKeys(),
        })
      }
    }
  }
}
