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
import { type CliCommand } from '../types.js'

// TODO: need a proper error/logging handler thing
// replace all these string throws and direct console.log/error
// with appropriate output and error handling.

export const usage: CliCommand['usage'] = () =>
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

const usageString = async () => (await usage()).usage()

export const command = async (conf: LoadedConfig) => {
  const sub = conf.positionals[0]
  if (conf.get('help') || !sub) {
    console.log(await usageString())
    return
  }

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
      console.error(await usageString())
      throw error('Unrecognized config command', {
        found: conf.positionals[0],
        validOptions: ['set', 'get', 'list', 'edit', 'help', 'del'],
      })
    }
  }
}

const help = (conf: LoadedConfig) => {
  const j = definition.toJSON()
  const fields = conf.positionals.slice(1)
  if (!fields.length) {
    console.log('Specify one or more options to see information:')
    console.log(
      Object.keys(j)
        .sort((a, b) => a.localeCompare(b, 'en'))
        .map(c => `  ${c}`)
        .join('\n'),
    )
    return
  }
  // TODO: some kind of fuzzy search?
  for (const f of fields) {
    const def = j[f]
    if (!def) {
      console.log(`unknown config field: ${f}`)
    } else {
      console.log(`--${f}${def.hint ? `=<${def.hint}>` : ''}
  type: ${
    isRecordField(f) ?
      'Record<string, string>'
    : def.type + (def.multiple ? '[]' : '')
  }${
    def.default ?
      `
  default: ${JSON.stringify(def.default)}\n`
    : ''
  }
${def.description}
  `)
    }
  }
}

const list = (conf: LoadedConfig) => {
  console.log(JSON.stringify(recordsToPairs(conf.options), null, 2))
}

const del = async (conf: LoadedConfig) => {
  const fields = conf.positionals.slice(1)
  if (!fields.length) {
    console.error(await usageString())
    throw error('At least one key is required')
  }
  await conf.deleteConfigKeys(conf.get('config'), fields)
}

const get = async (conf: LoadedConfig) => {
  const keys = conf.positionals.slice(1)
  const k = keys[0]
  if (!k || keys.length > 1) {
    console.error(await usageString())
    throw error('Exactly one key is required')
  }
  console.log(
    JSON.stringify(conf.get(k as keyof ConfigDefinitions), null, 2),
  )
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
    console.error(await usageString())
    throw error('At least one key=value pair is required')
  }
  const { values } = conf.jack.parseRaw(pairs.map(kv => `--${kv}`))
  const which = conf.get('config')
  await conf.addConfigToFile(which, pairsToRecords(values))
}
