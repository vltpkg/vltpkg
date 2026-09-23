import { error } from '@vltpkg/error-cause'
import { CacheEntry, assertOk } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import {
  removeStoreEntry,
  storeEntryLinked,
  storeEntryNames,
  storeEntryTime,
  verifyStoreEntry,
} from '@vltpkg/tar/store-entry'
import { readStoreIndex } from '@vltpkg/tar/store-index'
import { integrityHex } from '@vltpkg/types'
import { readFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
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

/** `verify`, `prune-store`: entries checked, and why each was removed */
export type StoreResult = {
  checked: number
  removed: Record<string, string>
}

export type CacheResult = void | CacheMap | StoreResult

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

export const views: Views<CacheResult> = {
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
      description: `Purge all cache items from before a given date, and
                    global store entries written before it. Date can be
                    provided in any format that JavaScript can parse.`,
    },

    'delete-all': {
      usage: '',
      description: `Delete the entire cache folder to make vlt slower.`,
    },

    verify: {
      usage: ['<package-spec> [<package-spec>...]', '--all'],
      description: `Check global store entries against their cached
                    tarballs (file list, contents, exec bits) and remove
                    any that differ or have no cached tarball, e.g. after
                    a file in \`node_modules\` was edited in place.`,
    },

    'prune-store': {
      usage: '',
      description: `Remove global store entries that no \`node_modules\`
                    folder links to.`,
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
    'verify --all': {
      description: 'Check every global store entry',
    },
  },
  options: {
    all: {
      description: 'With `verify`, check every global store entry.',
    },
  },
} as const satisfies CommandUsageDefinition

export const needsRegistry = true

export const usage: CommandUsage = () => commandUsage(usageDef)

export const command: CommandFn<CacheResult> = async conf => {
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

    case 'verify':
      return verify(conf, args, view)

    case 'prune-store':
      return pruneStore(conf, args, view)

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
  const rc = await conf.options.packageInfo.getRegistryClient()
  const { cache } = rc
  const map: CacheMap = {}
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
  const rc = await conf.options.packageInfo.getRegistryClient()
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
  const rc = await conf.options.packageInfo.getRegistryClient()
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
  const map = await deleteEntries(
    conf,
    [],
    entry => !!entry.date && entry.date < before,
    view,
  )
  const { storeRoot } = conf.options
  let count = 0
  for (const hex of storeEntryNames(storeRoot)) {
    const entry = resolve(storeRoot, hex)
    if (storeEntryTime(entry) < before.getTime()) {
      removeStoreEntry(entry)
      count++
    }
  }
  view?.stdout(`Removed ${entries(count)}`)
  return map
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
  const { cache } = await conf.options.packageInfo.getRegistryClient()
  await rm(cache.path(), { recursive: true, force: true })
  // every global store layout version, and a store root set elsewhere
  const rf = { recursive: true, force: true }
  await rm(resolve(conf.options.cache, 'store'), rf)
  if (cache.store) await rm(cache.store, rf)
  await mkdir(cache.path(), { recursive: true })
  view?.stdout('Deleted all cache entries.')
}

const entries = (n: number) =>
  `${n} global store entr${n === 1 ? 'y' : 'ies'}`

/** `name@version` from the entry's sidecar, else `hex` */
const entryLabel = (entry: string, hex: string) => {
  const i = readStoreIndex(entry)
  return i?.name && i.version ? `${i.name}@${i.version}` : hex
}

const verify = async (
  conf: LoadedConfig,
  specs: string[],
  view?: CacheView,
): Promise<StoreResult> => {
  const all = !!conf.values.all
  if (!specs.length && !all) {
    throw error('Must provide specs to verify, or --all', {
      code: 'EUSAGE',
    })
  }
  const { packageInfo, storeRoot } = conf.options
  const cachePath = (
    await packageInfo.getRegistryClient()
  ).cache.path()
  const present = new Set(storeEntryNames(storeRoot))
  const checks: [key: string, hex: string][] = []
  if (all) {
    for (const hex of present) checks.push([hex, hex])
  } else {
    for (const spec of specs) {
      const { integrity } = await packageInfo.resolve(
        Spec.parseArgs(spec, conf.options),
      )
      const hex = integrityHex(integrity)
      if (hex && present.has(hex)) checks.push([spec, hex])
      else view?.stdout('Not in the global store:', spec)
    }
  }
  const removed: Record<string, string> = {}
  for (const [key, hex] of checks) {
    const entry = resolve(storeRoot, hex)
    let tarball: Buffer | undefined
    try {
      tarball = CacheEntry.decode(
        readFileSync(resolve(cachePath, hex)),
      ).buffer()
    } catch {}
    const reason =
      tarball ? verifyStoreEntry(entry, tarball) : 'no cached tarball'
    if (reason) {
      // read before the sidecar goes
      const label = all ? entryLabel(entry, hex) : key
      removeStoreEntry(entry)
      removed[key] = reason
      view?.stdout('-', label, reason)
    }
  }
  const n = Object.keys(removed).length
  view?.stdout(`Checked ${entries(checks.length)}, removed ${n}`)
  return { checked: checks.length, removed }
}

const pruneStore = async (
  conf: LoadedConfig,
  _: string[],
  view?: CacheView,
): Promise<StoreResult> => {
  const { storeRoot } = conf.options
  const names = storeEntryNames(storeRoot)
  const removed: Record<string, string> = {}
  for (const hex of names) {
    const entry = resolve(storeRoot, hex)
    if (storeEntryLinked(entry)) continue
    removeStoreEntry(entry)
    removed[hex] = 'unused'
  }
  const n = Object.keys(removed).length
  view?.stdout(`Removed ${n} of ${entries(names.length)}`)
  return { checked: names.length, removed }
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
        const response = await (
          await packageInfo.getRegistryClient()
        ).request(resolved, {
          ...conf.options,
          integrity,
          staleWhileRevalidate: false,
          query: undefined,
        })
        // otherwise a 404 tarball still prints '+ <spec>'
        assertOk(response, {
          message: `Failed to cache ${spec}`,
          url: resolved,
        })
        view?.stdout('+', spec, r.resolved)
      })

    promises.push(p)
  }

  await Promise.all(promises)
}
