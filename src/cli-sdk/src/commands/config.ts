import { error } from '@vltpkg/error-cause'
import * as dotProp from '@vltpkg/dot-prop'
import { asRootError } from '@vltpkg/output/error'
import { isObject } from '@vltpkg/types'
import { spawnSync } from 'node:child_process'
import { getSortedKeys } from '../config/definition.ts'
import {
  definition,
  isRecordField,
  pairsToRecords,
  recordsToPairs,
} from '../config/index.ts'
import { commandUsage } from '../config/usage.ts'
import type {
  ConfigDefinitions,
  LoadedConfig,
  RecordPairs,
} from '../config/index.ts'
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

  await conf.deleteConfigKeys(conf.get('config'), fields)
}

const get = async (conf: LoadedConfig) => {
  const keys = conf.positionals.slice(1)
  const k = keys[0]
  if (!k || keys.length > 1) {
    throw error('Exactly one key is required', {
      code: 'EUSAGE',
    })
  }
  // check if this is a dot-prop path into a record field, in which case
  // we need to get the record first and then use dot-prop to get the value
  if (k.includes('.')) {
    const [field, ...rest] = k.split('.')
    const subKey = rest.join('.')

    if (!field || !subKey) {
      throw error('Could not read property', {
        found: k,
      })
    }

    // we'd need a type assertion helper from jackspeak definition
    // options in order to cast the field to a known name type
    // @ts-expect-error @typescript-eslint/no-unsafe-argument
    const record = conf.getRecord(field)

    return dotProp.get(record, subKey) as
      | string
      | number
      | boolean
      | string[]
      | undefined
  }

  // otherwise just get the value directly from the config getter
  return isRecordField(k) ?
      conf.getRecord(k)
    : conf.get(k as keyof ConfigDefinitions)
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

  // separate dot-prop paths from simple keys for different handling
  // any keys that include a dot (.) will be treated as dotPropPairs
  // other keys/value pairs are handled as simplePairs
  const dotPropPairs: {
    key: string
    field: string
    subKey: string
    value: string
  }[] = []
  const simplePairs: string[] = []

  for (const pair of pairs) {
    const eq = pair.indexOf('=')
    if (eq === -1) {
      throw error('Set arguments must contain `=`', {
        code: 'EUSAGE',
      })
    }

    const key = pair.substring(0, eq)
    const value = pair.substring(eq + 1)
    if (key.includes('.')) {
      const [field, ...rest] = key.split('.')
      const subKey = rest.join('.')
      if (field && subKey) {
        dotPropPairs.push({ key, field, subKey, value })
      } else {
        throw error('Could not read property', {
          found: pair,
        })
      }
    } else {
      simplePairs.push(pair)
    }
  }

  // Handle keys that consists of a single name (e.g., `--foo`)
  // so that it doesn't need the dot-prop logic to handle values
  if (simplePairs.length > 0) {
    try {
      const parsed = conf.jack.parseRaw(
        simplePairs.map(kv => `--${kv}`),
      ).values
      await conf.addConfigToFile(which, pairsToRecords(parsed))
    } catch (err) {
      handleSetError(simplePairs, err)
    }
  }

  // Handle dot-prop paths for record fields
  if (dotPropPairs.length > 0) {
    for (const { field, subKey, value } of dotPropPairs) {
      if (isRecordField(field)) {
        // For record fields, we add entries in the format field=key=value
        const recordPair = `${field}=${subKey}=${value}`
        try {
          const parsed = conf.jack.parseRaw([
            `--${recordPair}`,
          ]).values
          await conf.addConfigToFile(which, pairsToRecords(parsed))
          /* c8 ignore start */
        } catch (err) {
          handleSetError([recordPair], err)
        }
        /* c8 ignore end */
      }
    }
  }
}

const handleSetError = (simplePairs: string[], err: unknown) => {
  const { name, found, validOptions } = asRootError(err).cause
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
