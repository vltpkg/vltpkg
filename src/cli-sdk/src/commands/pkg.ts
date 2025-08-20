import { resolve } from 'node:path'
import * as dotProp from '@vltpkg/dot-prop'
import { error } from '@vltpkg/error-cause'
import type { PackageJson } from '@vltpkg/package-json'
import type { NormalizedManifest } from '@vltpkg/types'
import assert from 'node:assert'
import { commandUsage } from '../config/usage.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { init } from '@vltpkg/init'
import type { InitFileResults } from '@vltpkg/init'
import type { Views } from '../view.ts'
import { views as initViews } from './init.ts'
import { actual, GraphModifier } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import type { QueryResponseNode } from '@vltpkg/query'

type ManifestWithLocation = {
  manifest: NormalizedManifest
  location: string
}

const json = (
  results: ManifestWithLocation[] | ManifestWithLocation,
) => JSON.stringify(results, null, 2)

export const views = {
  human: (results_, _, config) => {
    const results = results_ as
      | ManifestWithLocation[]
      | ManifestWithLocation
    // `vlt pkg init` is an alias for `vlt init`
    // use the same output handling
    if (config.positionals[0] === 'init') {
      return initViews.human(results as InitFileResults)
    }

    return (
      Array.isArray(results) ?
        typeof results[0] === 'string' ?
          (results as unknown as string[]).join('\n')
        : json(results)
      : json(results)
    )
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

  const pkg = conf.options.packageJson

  // Handle --scope option to get multiple manifests
  const scopeQueryString = conf.get('scope')
  let manifests: ManifestWithLocation[]

  if (scopeQueryString) {
    const modifiers = GraphModifier.maybeLoad(conf.options)
    const monorepo = conf.options.monorepo
    const mainManifest = conf.options.packageJson.read(
      conf.options.projectRoot,
    )
    const graph = actual.load({
      ...conf.options,
      mainManifest,
      modifiers,
      monorepo,
      loadManifests: false,
    })

    const securityArchive =
      Query.hasSecuritySelectors(scopeQueryString) ?
        await SecurityArchive.start({
          graph,
          specOptions: conf.options,
        })
      : undefined

    const query = new Query({
      graph,
      specOptions: conf.options,
      securityArchive,
    })

    const { nodes } = await query.search(scopeQueryString, {
      signal: new AbortController().signal,
    })

    // collects the paths of the nodes selected using --scope
    const scopePaths = nodes
      .filter(
        (n): n is QueryResponseNode & { location: string } =>
          n.location !== undefined,
      )
      .map(n => resolve(conf.options.projectRoot, n.location))

    // reads multiple manifests for each selected scope
    manifests = scopePaths.map(location => ({
      manifest: pkg.read(location),
      location,
    }))

    if (manifests.length === 0) {
      throw error('No matching package found using scope', {
        found: scopeQueryString,
      })
    }
  } else {
    // Single manifest mode
    const location = pkg.find() ?? conf.projectRoot
    manifests = [
      {
        manifest: pkg.read(location),
        location,
      },
    ]
  }

  switch (sub) {
    case 'get':
      return get(manifests, args)
    case 'pick':
      return pick(manifests, args)
    case 'set':
      return set(manifests, pkg, args)
    case 'rm':
    case 'remove':
    case 'unset':
    case 'delete':
      return rm(manifests, pkg, args)
    default: {
      throw error('Unrecognized pkg command', {
        code: 'EUSAGE',
        found: sub,
        validOptions: ['get', 'set', 'rm'],
      })
    }
  }
}

const get = (manifests: ManifestWithLocation[], args: string[]) => {
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
    return pick(manifests, args)
  }
  assert(args[0] != null, noArg())

  const [key] = args

  if (manifests.length === 1) {
    const [firstManifest] = manifests
    if (!firstManifest?.manifest) {
      /* c8 ignore start */
      throw error(
        'No manifest found',
        firstManifest?.location ?
          { path: firstManifest.location }
        : {},
      )
      /* c8 ignore stop */
    }
    return dotProp.get(firstManifest.manifest, key)
  }

  return manifests.map(manifest =>
    dotProp.get(manifest.manifest, key),
  )
}

const pick = (manifests: ManifestWithLocation[], args: string[]) => {
  if (manifests.length === 1) {
    const [firstManifest] = manifests
    /* c8 ignore start */
    if (!firstManifest?.manifest) {
      throw error(
        'No manifest found',
        firstManifest?.location ?
          { path: firstManifest.location }
        : {},
      )
    }
    /* c8 ignore stop */
    const { manifest } = firstManifest
    return args.length ?
        args.reduce(
          (acc, key) =>
            dotProp.set(acc, key, dotProp.get(manifest, key)),
          {},
        )
      : manifest
  }

  // Multiple manifests - return results keyed by location
  return manifests.map(manifest =>
    args.length ?
      args.reduce(
        (acc, key) =>
          dotProp.set(acc, key, dotProp.get(manifest.manifest, key)),
        {},
      )
    : manifest.manifest,
  )
}

const set = (
  manifests: ManifestWithLocation[],
  pkg: PackageJson,
  args: string[],
) => {
  if (args.length < 1) {
    throw error('set requires arguments', { code: 'EUSAGE' })
  }

  for (const { manifest, location } of manifests) {
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
    }, manifest)

    pkg.write(location, res)
  }
}

const rm = (
  manifests: ManifestWithLocation[],
  pkg: PackageJson,
  args: string[],
) => {
  if (args.length < 1) {
    throw error('rm requires arguments', { code: 'EUSAGE' })
  }

  const results: ManifestWithLocation[] = []

  for (const { manifest, location } of manifests) {
    const res = args.reduce((acc, key) => {
      dotProp.del(acc, key)
      return acc
    }, manifest)

    pkg.write(location, res)
    results.push({
      manifest: res,
      location,
    })
  }

  if (manifests.length === 1) {
    return results[0]
  }
  return results
}
