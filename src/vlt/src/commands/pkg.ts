import { error } from '@vltpkg/error-cause'
import { LoadedConfig } from '../config/index.js'
import { PackageJson } from '@vltpkg/package-json'
import * as dotProp from '@vltpkg/package-json/dot-prop'
import { Manifest } from '@vltpkg/types'

export const usage = `Usage:
  vlt pkg get [<key>]
  vlt pkg pick [<key> [<key> ...]]
  vlt pkg set <key>=<value> [<key>=<value> ...]
  vlt pkg set [<array>[<index>].<key>=<value> ...]
  vlt pkg set [<array>[].<key>=<value> ...]
  vlt pkg <rm|remove|unset|delete> <key> [<key> ...]`

export const command = async (conf: LoadedConfig) => {
  const [sub, ...args] = conf.positionals
  const pkg = new PackageJson()
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
      console.error(usage)
      throw error('Unrecognized pkg command', {
        found: sub,
        validOptions: ['get', 'set', 'rm'],
      })
    }
  }
}

const get = (mani: Manifest, args: string[]) => {
  if (args.length !== 1) {
    if (args.length > 1) {
      throw error(
        'get requires not more than 1 argument. use `pick` to get more than 1.',
      )
    }
    return pick(mani, args)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const arg = args[0]!
  console.log(JSON.stringify(dotProp.get(mani, arg), null, 2))
}

const pick = (mani: Manifest, args: string[]) => {
  const res =
    args.length ?
      args.reduce(
        (acc, key) => dotProp.set(acc, key, dotProp.get(mani, key)),
        {},
      )
    : mani
  console.log(JSON.stringify(res, null, 2))
}

const set = (
  conf: LoadedConfig,
  mani: Manifest,
  pkg: PackageJson,
  args: string[],
) => {
  if (args.length < 1) {
    throw error('set requires arguments')
  }

  const res = args.reduce((acc, p) => {
    const index = p.indexOf('=')
    if (index === -1) {
      throw error('set arguments must contain `=`')
    }
    const key = p.substring(0, index)
    const value = p.substring(index + 1)
    return dotProp.set(acc, key, value)
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
    throw error('rm requires arguments')
  }

  const res = args.reduce((acc, key) => {
    dotProp.del(acc, key)
    return acc
  }, mani)

  pkg.write(conf.projectRoot, res)
}
