import { spawnSync } from 'node:child_process'
import * as dotProp from '@vltpkg/dot-prop'
import { error } from '@vltpkg/error-cause'
import { asRootError } from '@vltpkg/output/error'
import { isObject } from '@vltpkg/types'
import { getSortedKeys } from '@vltpkg/cli-sdk/definition'
import {
  isRecordField,
  pairsToRecords,
  recordsToPairs,
} from '@vltpkg/cli-sdk/config'

import type {
  ConfigDefinitions,
  LoadedConfig,
} from '@vltpkg/cli-sdk/config'

export const list = (conf: LoadedConfig) => {
  return recordsToPairs(conf.options)
}

export const del = async (conf: LoadedConfig) => {
  const fields = conf.positionals.slice(1)
  if (!fields.length) {
    throw error('At least one key is required', {
      code: 'EUSAGE',
    })
  }

  const configOption = conf.get('config')
  const whichConfig =
    configOption === 'all' ? 'project' : configOption
  await conf.deleteConfigKeys(whichConfig, fields)
}

export const get = async (conf: LoadedConfig) => {
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

export const edit = async (conf: LoadedConfig) => {
  const [command, ...args] = conf.get('editor').split(' ')
  if (!command) {
    throw error(`editor is empty`)
  }
  const configOption = conf.get('config')
  const whichConfig =
    configOption === 'all' ? 'project' : configOption
  await conf.editConfigFile(whichConfig, file => {
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

export const set = async (conf: LoadedConfig) => {
  const pairs = conf.positionals.slice(1)
  if (!pairs.length) {
    // Create an empty config file
    const configOption = conf.get('config')
    const whichConfig =
      configOption === 'all' ? 'project' : configOption
    await conf.addConfigToFile(whichConfig, {})
    return
  }

  const configOption = conf.get('config')
  const which = configOption === 'all' ? 'project' : configOption

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
