import { error } from '@vltpkg/error-cause'
import { type LoadedConfig } from '../config/index.js'
import { type PackageJson } from '@vltpkg/package-json'
import * as dotProp from '@vltpkg/dot-prop'
import { type Manifest } from '@vltpkg/types'
import {
  type CommandUsage,
  type CommandFn,
  type Views,
} from '../types.js'
import assert from 'assert'
import { commandUsage } from '../config/usage.js'

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'pkg',
    usage: '[<command>] [<args>]',
    description: 'Get or manipulate package.json values',
    subcommands: {
      get: {
        usage: '[<key>]',
        description: 'Get a single value',
      },
      pick: {
        usage: '[<key> [<key> ...]]',
        description: 'Get multiple values or the entire package',
      },
      set: {
        usage: '<key>=<value> [<key>=<value> ...]',
        description: 'Set one or more key value pairs',
      },
      delete: {
        usage: '<key> [<key> ...]',
        description: 'Delete one or more keys from the package',
      },
    },
    examples: {
      'set "array[1].key=value"': {
        description: 'Set a value on an object inside an array',
      },
      'set "array[]=value"': {
        description: 'Append a value to an array',
      },
    },
  })

export const views: Views<unknown> = {
  defaultView: 'json',
}

export const command: CommandFn<unknown> = async conf => {
  const [sub, ...args] = conf.positionals
  const pkg = conf.options.packageJson
  const mani = pkg.read(conf.projectRoot)

  switch (sub) {
    case 'get':
      return get(mani, args)
    case 'pick':
      return pick(mani, args)
    case 'set':
      return set(conf, mani, pkg, args)
    case 'rm':
    case 'remove':
    case 'unset':
    case 'delete':
      return rm(conf, mani, pkg, args)
    default: {
      throw error('Unrecognized pkg command', {
        code: 'EUSAGE',
        found: sub,
        validOptions: ['get', 'set', 'rm'],
      })
    }
  }
}

const get = (mani: Manifest, args: string[]) => {
  const noArg = () =>
    error(
      'get requires not more than 1 argument. use `pick` to get more than 1.',
      { code: 'EUSAGE' },
      noArg,
    )
  if (args.length !== 1) {
    if (args.length > 1) {
      throw noArg()
    }
    return pick(mani, args)
  }
  assert(args[0], noArg())
  return {
    result: dotProp.get(mani, args[0]),
  }
}

const pick = (mani: Manifest, args: string[]) => {
  return {
    result:
      args.length ?
        args.reduce(
          (acc, key) => dotProp.set(acc, key, dotProp.get(mani, key)),
          {},
        )
      : mani,
  }
}

const set = (
  conf: LoadedConfig,
  mani: Manifest,
  pkg: PackageJson,
  args: string[],
) => {
  if (args.length < 1) {
    throw error('set requires arguments', { code: 'EUSAGE' })
  }

  const res = args.reduce((acc, p) => {
    const index = p.indexOf('=')
    if (index === -1) {
      throw error('set arguments must contain `=`', {
        code: 'EUSAGE',
      })
    }
    return dotProp.set(
      acc,
      p.substring(0, index),
      p.substring(index + 1),
    )
  }, mani)

  pkg.write(conf.projectRoot, res)
}

const rm = (
  conf: LoadedConfig,
  mani: Manifest,
  pkg: PackageJson,
  args: string[],
) => {
  if (args.length < 1) {
    throw error('rm requires arguments', { code: 'EUSAGE' })
  }

  const res = args.reduce((acc, key) => {
    dotProp.del(acc, key)
    return acc
  }, mani)

  pkg.write(conf.projectRoot, res)
}
