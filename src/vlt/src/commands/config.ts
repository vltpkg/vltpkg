import {
  ConfigDefinitions,
  definition,
  isRecordField,
  LoadedConfig,
  pairsToRecords,
  recordsToPairs,
} from '../config/index.js'
import { error } from '@vltpkg/error-cause'
import openEditor from 'open-editor'

// TODO: need a proper error/logging handler thing
// replace all these string throws and direct console.log/error
// with appropriate output and error handling.

export const usage = `Usage:
  vlt config get <key> [<key> ...]
  vlt config ls
  vlt config set <key>=<value> [<key>=<value> ...] [--config=<user | project>]
  vlt config del <key> [<key> ...] [--config=<user | project>]
  vlt config edit [--config=<user | project>]
  vlt config help [field ...]`

export const command = async (conf: LoadedConfig) => {
  const sub = conf.positionals[0]
  if (conf.get('help') || !sub) {
    console.log(usage)
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
      console.error(usage)
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

const del = (conf: LoadedConfig) => {
  const fields = conf.positionals.slice(1)
  if (!fields.length) {
    console.error(usage)
    throw error('At least one key is required')
  }
  conf.deleteConfigKeys(
    conf.get('config') as 'user' | 'project',
    fields,
  )
}

const get = (conf: LoadedConfig) => {
  const keys = conf.positionals.slice(1)
  const k = keys[0]
  if (!k || keys.length > 1) {
    console.error(usage)
    throw error('Exactly one key is required')
  }
  console.log(
    JSON.stringify(conf.get(k as keyof ConfigDefinitions), null, 2),
  )
}

const edit = async (conf: LoadedConfig) => {
  await conf.editConfigFile(
    conf.get('config') as 'user' | 'project',
    async file => await openEditor([file], { wait: true }),
  )
}

const set = async (conf: LoadedConfig) => {
  const pairs = conf.positionals.slice(1)
  if (!pairs.length) {
    console.error(usage)
    throw error('At least one key=value pair is required')
  }
  const { values } = conf.jack.parseRaw(pairs.map(kv => `--${kv}`))
  const which = conf.get('config') as 'user' | 'project'
  await conf.addConfigToFile(which, pairsToRecords(values))
}
