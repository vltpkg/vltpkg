import { error } from '@vltpkg/error-cause'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import type { VlxInfo } from '@vltpkg/vlx'
import * as vlx from '@vltpkg/vlx'
import { basename } from 'node:path'
import type { LoadedConfig } from '../config/index.ts'
import type { CommandUsageDefinition } from '../config/usage.ts'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { stdout } from '../output.ts'
import type { ViewOptions, Views } from '../view.ts'
import { ViewClass } from '../view.ts'

export type ExecCacheSubcommands =
  keyof (typeof usageDef)['subcommands']

let view: ExecCacheView
export class ExecCacheView extends ViewClass {
  constructor(options: ViewOptions, conf: LoadedConfig) {
    super(options, conf)
    view = this
  }
  stdout(...args: unknown[]) {
    stdout(...args)
  }
}

export const views: Views<void | string[] | VlxInfo[]> = {
  human: ExecCacheView,
}

const usageDef = {
  command: 'exec-cache',
  usage: '<command> [flags]',
  description: 'Work with vlt exec-cache folders',

  subcommands: {
    ls: {
      usage: '',
      description: `Show previously installed packages used for \`vlt exec\`.
                    Key provided can be either the package name, or the full
                    key.`,
    },

    delete: {
      usage: '[<key>...]',
      description: `Delete previously installed packages used for
                    \`vlt exec\`. If no keys are provided, then all entries
                    will be deleted.`,
    },

    info: {
      usage: '<key>',
      description: `Show extended information about a given \`vlt exec\`
                    installation.`,
    },

    install: {
      usage: '<spec>...',
      description: `Install the specified package(s) in the \`vlt exec\`
                    central cache location. Metadata info about each
                    installation will be printed.`,
    },
  },

  examples: {
    ls: {
      description: `Show all the keys for the installations in the \`vlt exec\`
                    cache.`,
    },
    'delete typescript': {
      description: `Delete all versions of typescript installed for vlt exec`,
    },
    'info typescript-695bf962': {
      description: `Show extended info about a specific version of typescript`,
    },
  },
} as const satisfies CommandUsageDefinition

export const usage: CommandUsage = () => commandUsage(usageDef)

export const command: CommandFn<
  string[] | VlxInfo[]
> = async conf => {
  const [sub, ...args] = conf.positionals
  switch (sub) {
    case 'ls':
      return ls(conf, args, view)

    case 'info':
      return info(conf, args, view)

    case 'install':
      return install(conf, args, view)

    case 'delete':
      return deleteEntries(conf, args, view)

    default: {
      throw error('Unrecognized exec-cache command', {
        code: 'EUSAGE',
        found: sub,
        validOptions: Object.keys(usageDef.subcommands),
      })
    }
  }
}

const install = async (
  conf: LoadedConfig,
  keys: string[],
  view?: ExecCacheView,
): Promise<string[]> => {
  if (!keys.length) {
    throw error('Must supply a package spec to install', {
      code: 'EUSAGE',
    })
  }
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  return Promise.all(
    keys.map(async key => {
      const info = await vlx.install(key, {
        ...conf.options,
        query: undefined,
        allowScripts,
      })
      view?.stdout(info)
      return info.path
    }),
  )
}

const ls = async (
  _conf: LoadedConfig,
  args: string[],
  view?: ExecCacheView,
): Promise<string[]> => {
  const results: string[] = []
  const vlxPaths: AsyncIterable<string> = vlx.list()
  // eslint-disable-next-line @typescript-eslint/await-thenable
  for await (const path of vlxPaths) {
    const key = basename(path)
    if (args.length && !args.some(a => key.includes(a))) continue
    results.push(key)
    view?.stdout(key)
  }
  return results
}

const info = async (
  conf: LoadedConfig,
  keys: string[],
  view?: ExecCacheView,
): Promise<VlxInfo[]> => {
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  const results: VlxInfo[] = []
  if (keys.length) {
    for (const key of keys) {
      const info = vlx.info(key, {
        ...conf.options,
        query: undefined,
        allowScripts,
      })
      results.push(info)
      view?.stdout(info)
    }
  } else {
    const vlxPaths: AsyncIterable<string> = vlx.list()
    // eslint-disable-next-line @typescript-eslint/await-thenable
    for await (const key of vlxPaths) {
      const info = vlx.info(key, {
        ...conf.options,
        query: undefined,
        allowScripts,
      })
      results.push(info)
      view?.stdout(info)
    }
  }
  return results
}

const deleteEntries = async (
  conf: LoadedConfig,
  keys: string[],
  view?: ExecCacheView,
): Promise<string[]> => {
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  const remover = new RollbackRemove()
  const removed = (
    await vlx.delete(keys, remover, {
      ...conf.options,
      query: undefined,
      allowScripts,
    })
  ).map(path => {
    view?.stdout(`- ${basename(path)}`)
    return path
  })
  remover.confirm()
  return removed
}
