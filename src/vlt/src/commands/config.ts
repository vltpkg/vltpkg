import { error } from '@vltpkg/error-cause'
import { spawnSync } from 'child_process'
import {
  ConfigDefinitions,
  definition,
  isRecordField,
  LoadedConfig,
  pairsToRecords,
  recordsToPairs,
} from '../config/index.js'
import { commandUsage } from '../config/usage.js'
import { CliCommandFn, CliCommandUsage } from '../types.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'config',
    usage: '<command> [flags]',
    description:
      'Get or manipulate the configuration for the vlt CLI',
    subcommands: {
      get: {
        usage: '<key> [<key> ...]',
        description: 'Get the value of a configuration key',
      },
      ls: {
        description: 'List all configuration keys and values',
      },
      set: {
        usage:
          '<key>=<value> [<key>=<value> ...] [--config=<user | project>]',
        description: 'Set the value of a configuration key',
      },
      del: {
        usage: '<key> [<key> ...] [--config=<user | project>]',
        description: 'Delete a configuration key',
      },
      edit: {
        usage: '[--config=<user | project>]',
        description: 'Edit the configuration file',
      },
      help: {
        usage: '[field ...]',
        description: 'Show help for a specific configuration field',
      },
    },
  })

export const command: CliCommandFn = async conf => {
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
    ]
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
  return res
}

const list = (conf: LoadedConfig) => {
  return { result: recordsToPairs(conf.options) }
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
  return { result: conf.get(k as keyof ConfigDefinitions) }
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
