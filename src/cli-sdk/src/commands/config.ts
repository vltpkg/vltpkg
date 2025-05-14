import { error } from '@vltpkg/error-cause'
import { asRootError } from '@vltpkg/output/error'
import { isObject } from '@vltpkg/types'
import { spawnSync } from 'node:child_process'
import { getSortedKeys } from '../config/definition.ts'
import type {
  ConfigDefinitions,
  ConfigFileData,
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
    throw error('At least one key=value pair is required', {
      code: 'EUSAGE',
    })
  }
  let parsed: ConfigFileData | null = null
  try {
    parsed = conf.jack.parseRaw(pairs.map(kv => `--${kv}`)).values
  } catch (er) {
    const { name, found, value, wanted, validOptions } =
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
    if (wanted && !value && typeof name === 'string') {
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
      found: pairs.map(kv => kv.split('=')[0]),
      validOptions: getSortedKeys(),
    })
  }
  await conf.addConfigToFile(
    conf.get('config'),
    pairsToRecords(parsed),
  )
}
