import { error } from '@vltpkg/error-cause'
import { CacheEntry } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import { mkdir, rm } from 'node:fs/promises'
import prettyBytes from 'pretty-bytes'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandUsageDefinition } from '../config/usage.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { stderr, stdout } from '../output.ts'
import type { ViewOptions, Views } from '../view.ts'
import { ViewClass } from '../view.ts'

export type CacheMap = Record<
  string,
  ReturnType<CacheEntry['toJSON']>
>

export type CacheSubcommands = keyof (typeof usageDef)['subcommands']

let view: CacheView
export class CacheView extends ViewClass {
  constructor(options: ViewOptions, conf: LoadedConfig) {
    super(options, conf)
    view = this
  }
  stdout(...args: unknown[]) {
    stdout(...args)
  }
}

export const views: Views<void | CacheMap> = {
  human: CacheView,
}

const usageDef = {
  command: 'cache',
  usage: '<command> [flags]',
  description: 'Work with vlt cache folders',

  subcommands: {
    add: {
      usage: '<package-spec> [<package-spec>...]',
      description: `Resolve the referenced package identifiers and ensure they
                    are cached.`,
    },

    ls: {
      usage: '[<key>...]',
      description: `Show cache entries. If no keys are provided, then a list of
                    available keys will be printed. If one or more keys are
                    provided, then details will be shown for the specified
                    items.`,
    },

    info: {
      usage: '<key>',
      description: `Print metadata details for the specified cache key to
                    stderr, and the response body to stdout.`,
    },

    clean: {
      usage: '[<key>...]',
      description: `Purge expired cache entries. If one or more keys are
                    provided, then only those cache entries will be
                    considered.`,
    },

    delete: {
      usage: '<key> [<key>...]',
      description: `Purge items explicitly, whether expired or not.  If one or
                    more keys are provided, then only those cache entries will
                    be considered.`,
    },

    'delete-before': {
      usage: '<date>',
      description: `Purge all cache items from before a given date. Date can be
                    provided in any format that JavaScript can parse.`,
    },

    'delete-all': {
      usage: '',
      description: `Delete the entire cache folder to make vlt slower.`,
    },
  },
  examples: {
    'vlt cache ls https://registry.npmjs.org/typescript': {
      description: `Show cache metadata for a given registry URL`,
    },
    'vlt cache add eslint@latest': {
      description: `Add a given package specifier to the cache by fetching
                    its resolved value.`,
    },
    'vlt cache info https://registry.npmjs.org/eslint/-/eslint-9.25.1.tgz > eslint.tgz':
      {
        description: `Print the cache metadata to stderr, and write the tarball
                    on stdout, redirecting to a file.`,
      },
    'vlt cache delete-before 2025-01-01': {
      description: 'Delete all entries created before Jan 1, 2025',
    },
  },
} as const satisfies CommandUsageDefinition

export const usage: CommandUsage = () => commandUsage(usageDef)

export const command: CommandFn<void | CacheMap> = async conf => {
  const [sub, ...args] = conf.positionals
  switch (sub) {
    case 'ls':
      return ls(conf, args, view)

    case 'info':
      return info(conf, args, view)

    case 'add':
      return add(conf, args, view)

    case 'clean':
      return clean(conf, args, view)

    case 'delete':
      return deleteKeys(conf, args, view)

    case 'delete-before':
      return deleteBefore(conf, args, view)

    case 'delete-all':
      return deleteAll(conf, args, view)

    default: {
      throw error('Unrecognized cache command', {
        code: 'EUSAGE',
        found: sub,
        validOptions: Object.keys(usageDef.subcommands),
      })
    }
  }
}

const ls = async (
  conf: LoadedConfig,
  keys: string[],
  view?: CacheView,
): Promise<CacheMap> =>
  keys.length ?
    await fetchKeys(
      conf,
      keys,
      (entry: CacheEntry, key: string) => {
        view?.stdout(
          key.includes(' ') ? JSON.stringify(key) : key,
          entry,
        )
        return true
      },
      view,
    )
  : await fetchAll(conf, (_, key) => {
      view?.stdout(key.includes(' ') ? JSON.stringify(key) : key)
      return true
    })

const info = async (
  conf: LoadedConfig,
  keys: string[],
  view?: CacheView,
): Promise<void> => {
  const [key] = keys
  if (keys.length !== 1 || !key) {
    throw error('Must provide exactly one cache key', {
      code: 'EUSAGE',
    })
  }
  await fetchKeys(
    conf,
    [key],
    (entry: CacheEntry, key: string) => {
      stderr(
        /* c8 ignore next */
        key.includes(' ') ? JSON.stringify(key) : key,
        entry,
      )
      if (entry.isJSON) {
        stdout(JSON.stringify(entry.body, null, 2))
        /* c8 ignore start - annoying to test, corrupts TAP output */
      } else {
        process.stdout.write(entry.body as Buffer)
      }
      /* c8 ignore stop */
      return true
    },
    view,
  )
}

const fetchAll = async (
  conf: LoadedConfig,
  test: (entry: CacheEntry, key: string, val: Buffer) => boolean,
) => {
  const rc = conf.options.packageInfo.registryClient
  const { cache } = rc
  const map: CacheMap = {}
  // eslint-disable-next-line @typescript-eslint/await-thenable
  for await (const [key, val] of cache) {
    const entry = CacheEntry.decode(val)
    if (!test(entry, key, val)) continue
    map[key] = entry.toJSON()
  }
  return map
}

const fetchKeys = async (
  conf: LoadedConfig,
  keys: string[],
  test: (entry: CacheEntry, key: string, buf: Buffer) => boolean,
  view?: CacheView,
) => {
  const rc = conf.options.packageInfo.registryClient
  const { cache } = rc
  const map: CacheMap = {}
  const results: [string, Buffer | undefined][] = await Promise.all(
    keys.map(async key => {
      return [key, await cache.fetch(key)]
    }),
  )
  for (const [key, val] of results) {
    if (!val) {
      view?.stdout('Not found:', key)
    } else {
      const entry = CacheEntry.decode(val)
      if (!test(entry, key, val)) continue
      map[key] = entry.toJSON()
    }
  }

  return map
}

const deleteEntries = async (
  conf: LoadedConfig,
  keys: string[],
  test: (entry: CacheEntry) => boolean,
  view?: CacheView,
) => {
  const rc = conf.options.packageInfo.registryClient
  const { cache } = rc

  let count = 0
  let size = 0
  const testAction = (
    entry: CacheEntry,
    key: string,
    val: Buffer,
  ) => {
    if (!test(entry)) {
      return false
    }
    count++
    const s = val.byteLength + key.length
    cache.delete(key, true, entry.integrity)
    const k = key.includes(' ') ? JSON.stringify(key) : key
    view?.stdout('-', k, s)
    size += s
    return true
  }

  const map = await (keys.length ?
    fetchKeys(conf, keys, testAction, view)
  : fetchAll(conf, testAction))

  const pb = prettyBytes(size, { binary: true })

  const s = count === 1 ? '' : 's'
  await cache.promise()
  view?.stdout(`Removed ${count} item${s} totalling ${pb}`)
  return map
}

const clean = async (
  conf: LoadedConfig,
  keys: string[],
  view?: CacheView,
) => deleteEntries(conf, keys, entry => !entry.valid, view)

const deleteBefore = async (
  conf: LoadedConfig,
  args: string[],
  view?: CacheView,
) => {
  if (!args.length) {
    throw error('Must provide a date to delete before', {
      code: 'EUSAGE',
    })
  }
  const now = new Date()
  const before = new Date(args.join(' '))
  if (before >= now) {
    throw error('Cannot delete cache entries from the future', {
      code: 'EUSAGE',
      found: before,
    })
  }
  return deleteEntries(
    conf,
    [],
    entry => !!entry.date && entry.date < before,
    view,
  )
}

const deleteKeys = async (
  conf: LoadedConfig,
  keys: string[],
  view?: CacheView,
) => {
  if (!keys.length) {
    throw error('Must provide cache keys to delete', {
      code: 'EUSAGE',
    })
  }
  return deleteEntries(conf, keys, () => true, view)
}

const deleteAll = async (
  conf: LoadedConfig,
  _: string[],
  view?: CacheView,
) => {
  const { cache } = conf.options.packageInfo.registryClient
  await rm(cache.path(), { recursive: true, force: true })
  await mkdir(cache.path(), { recursive: true })
  view?.stdout('Deleted all cache entries.')
}

const add = async (
  conf: LoadedConfig,
  specs: string[],
  view?: CacheView,
) => {
  if (!specs.length) {
    throw error('Must provide specs to add to the cache', {
      code: 'EUSAGE',
    })
  }
  const { packageInfo } = conf.options
  const promises: Promise<void>[] = []

  for (const spec of specs) {
    const p = packageInfo
      .resolve(Spec.parseArgs(spec, conf.options), {
        staleWhileRevalidate: false,
      })
      .then(async r => {
        const { resolved, integrity } = r
        await packageInfo.registryClient.request(resolved, {
          ...conf.options,
          integrity,
          staleWhileRevalidate: false,
          query: undefined,
        })
        view?.stdout('+', spec, r.resolved)
      })

    promises.push(p)
  }

  await Promise.all(promises)
}
