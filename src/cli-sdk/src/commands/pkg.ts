import assert from 'node:assert'
import { resolve } from 'node:path'
import * as dotProp from '@vltpkg/dot-prop'
import { error } from '@vltpkg/error-cause'
import { init } from '@vltpkg/init'
import { actual, GraphModifier, VIRTUAL_ROOT_ID } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import { views as initViews } from './init.ts'
import { commandUsage } from '../config/usage.ts'
import { createHostContextsMap } from '../query-host-contexts.ts'
import type { Graph } from '@vltpkg/graph'
import type { PackageJson } from '@vltpkg/package-json'
import type { NormalizedManifest, NodeLike } from '@vltpkg/types'
import type { InitFileResults } from '@vltpkg/init'
import type { CommandFn, CommandUsage } from '../index.ts'
import type { LoadedConfig } from '../config/index.ts'
import type { Views } from '../view.ts'

export const views = {
  human: (results, _, config) => {
    // `vlt pkg init` is an alias for `vlt init`
    // use the same output handling
    if (config.positionals[0] === 'init') {
      return initViews.human(results as InitFileResults)
    }

    // When `get` is run with a single arg and it returns a string,
    // just print items separated by newlines
    if (Array.isArray(results) && typeof results[0] === 'string') {
      return results.join('\n')
    }

    return JSON.stringify(results, null, 2)
  },
} as const satisfies Views

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
      init: {
        usage: '',
        description:
          'Initialize a new package.json file in the current directory',
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

export const command: CommandFn = async conf => {
  const [sub, ...args] = conf.positionals
  if (sub === 'init') {
    return await init({ cwd: process.cwd() })
  }

  assert(
    sub,
    error('pkg command requires a subcommand', {
      code: 'EUSAGE',
      validOptions: ['get', 'pick', 'set', 'rm', 'init'],
    }),
  )

  const { options, projectRoot } = conf
  const queryString = conf.get('scope')
  const paths = conf.get('workspace')
  const groups = conf.get('workspace-group')
  const recursive = conf.get('recursive')

  const locations: string[] = []
  let single: string | null = null

  if (queryString) {
    const modifiers = GraphModifier.maybeLoad(options)
    const mainManifest = options.packageJson.maybeRead(projectRoot)
    let graph: Graph | undefined
    let securityArchive: SecurityArchive | undefined

    if (mainManifest) {
      graph = actual.load({
        ...options,
        mainManifest,
        modifiers,
        monorepo: options.monorepo,
        loadManifests: false,
      })
      securityArchive =
        Query.hasSecuritySelectors(queryString) ?
          await SecurityArchive.start({
            nodes: [...graph.nodes.values()],
          })
        : undefined
    }

    const hostContexts = await createHostContextsMap(conf)
    const edges = graph?.edges ?? new Set()
    const nodes =
      graph?.nodes ?
        new Set<NodeLike>(graph.nodes.values())
      : /* c8 ignore next */ new Set<NodeLike>()
    const importers = graph?.importers ?? new Set()
    const query = new Query({
      edges,
      nodes,
      importers,
      securityArchive,
      hostContexts,
    })

    const { nodes: resultNodes } = await query.search(queryString, {
      signal: new AbortController().signal,
    })

    for (const node of resultNodes) {
      const location = node.location
      assert(
        location,
        error(`node ${node.id} has no location`, {
          found: node,
        }),
      )
      if (node.id !== VIRTUAL_ROOT_ID) {
        locations.push(resolve(node.projectRoot, location))
      }
    }
  } else if (paths?.length || groups?.length || recursive) {
    for (const workspace of options.monorepo ?? []) {
      locations.push(workspace.fullpath)
    }
  } else {
    single = options.packageJson.find(process.cwd()) ?? projectRoot
  }

  if (single) {
    return commandSingle(single, sub, args, conf)
  }

  assert(
    locations.length > 0,
    error('No matching package found using scope', {
      found: queryString || 'workspace selection',
    }),
  )

  const results: unknown[] = []
  for (const location of locations) {
    results.push(await commandSingle(location, sub, args, conf))
  }

  return results
}

const commandSingle = async (
  location: string,
  sub: string,
  args: string[],
  conf: LoadedConfig,
) => {
  const pkg = conf.options.packageJson
  const manifest = pkg.read(location)

  switch (sub) {
    case 'get':
      return get(manifest, args)
    case 'pick':
      return pick(manifest, args)
    case 'set':
      return set(manifest, location, pkg, args)
    case 'rm':
    case 'remove':
    case 'unset':
    case 'delete':
      return rm(manifest, location, pkg, args)
    default: {
      throw error('Unrecognized pkg command', {
        code: 'EUSAGE',
        found: sub,
        validOptions: ['get', 'set', 'rm'],
      })
    }
  }
}

const get = (manifest: NormalizedManifest, args: string[]) => {
  const noArg = () =>
    error(
      'get requires not more than 1 argument. use `pick` to get more than 1.',
      { code: 'EUSAGE' },
      noArg,
    )

  if (args.length === 1) {
    const [key] = args
    assert(key, noArg())
    return dotProp.get(manifest, key)
  }

  assert(args.length === 0, noArg())
  return pick(manifest, args)
}

const pick = (manifest: NormalizedManifest, args: string[]) => {
  return args.length ?
      args.reduce(
        (acc, key) =>
          dotProp.set(acc, key, dotProp.get(manifest, key)),
        {},
      )
    : manifest
}

const set = (
  manifest: NormalizedManifest,
  location: string,
  pkg: PackageJson,
  args: string[],
) => {
  assert(
    args.length >= 1,
    error('set requires arguments', { code: 'EUSAGE' }),
  )

  const res = args.reduce((acc, p) => {
    const index = p.indexOf('=')

    assert(
      index !== -1,
      error('set arguments must contain `=`', {
        code: 'EUSAGE',
      }),
    )

    return dotProp.set(
      acc,
      p.substring(0, index),
      p.substring(index + 1),
    )
  }, manifest)

  pkg.write(location, res)
}

const rm = (
  manifest: NormalizedManifest,
  location: string,
  pkg: PackageJson,
  args: string[],
) => {
  assert(
    args.length >= 1,
    error('rm requires arguments', { code: 'EUSAGE' }),
  )

  const res = args.reduce((acc, key) => {
    dotProp.del(acc, key)
    return acc
  }, manifest)

  pkg.write(location, res)

  return {
    manifest: res,
    location,
  }
}
