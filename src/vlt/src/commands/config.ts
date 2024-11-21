import { error } from '@vltpkg/error-cause'
import { spawnSync } from 'child_process'
import {
  type ConfigDefinitions,
  definition,
  isRecordField,
  type LoadedConfig,
  pairsToRecords,
  type RecordPairs,
  recordsToPairs,
} from '../config/index.js'
import { commandUsage } from '../config/usage.js'
import {
  type CliCommandView,
  type CliCommandFn,
  type CliCommandUsage,
} from '../types.js'

export const usage: CliCommandUsage = () =>
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
        description: `Delete the named config fields. If no values remain in the config file,
                      delete the file as well. By default, operates on the \`vlt.json\` file
                      in the root of the current project. To delete a config field from the
                      user config file, specify \`--config=user\`.`,
      },
      edit: {
        usage: '[--config=<user | project>]',
        description: 'Edit the configuration file',
      },
      help: {
        usage: '[field ...]',
        description:
          'Get information about a config field, or show a list of known config field names.',
      },
    },
  })

export const view: CliCommandView = {
  human: (data, _, conf) => {
    if (conf.positionals[0] === 'help') {
      const res: string[] = []
      if (Array.isArray(data)) {
        res.push('Specify one or more options to see information:')
        res.push(...data.map(c => `  ${c}`))
      } else {
        for (const [f, def] of Object.entries(
          data as Record<
            string,
            ReturnType<typeof definition.toJSON>[string] | null
          >,
        )) {
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
      }
      return res.join('\n')
    }
  },
}

export const command: CliCommandFn<
  string | number | boolean | string[] | undefined | RecordPairs
> = async conf => {
  const sub = conf.positionals[0]
  switch (sub) {
    case 'set':
      return set(conf)
    case 'get':
      return { result: await get(conf) }
    case 'ls':
    case 'list':
      return { result: list(conf) }
    case 'edit':
      return edit(conf)
    case 'help':
      return { result: help(conf) }
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
    return Object.keys(j).sort((a, b) => a.localeCompare(b, 'en'))
  }
  // TODO: some kind of fuzzy search?
  const res: Record<string, (typeof j)[string] | null> = {}
  for (const f of fields) {
    const def = j[f]
    res[f] = def ?? null
  }
  return res
}

const list = (conf: LoadedConfig) => recordsToPairs(conf.options)

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
  // TODO: maybe throw EUSAGE if k is not actually a keyof definitions?
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
  await conf.addConfigToFile(
    conf.get('config'),
    pairsToRecords(
      conf.jack.parseRaw(pairs.map(kv => `--${kv}`)).values,
    ),
  )
}
