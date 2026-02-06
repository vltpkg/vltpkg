#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { relative, join } from 'node:path'
import { subset } from 'semver'
import { Config } from '@vltpkg/cli-sdk/config'
import { actual } from '@vltpkg/graph'
import { Query } from '@vltpkg/query'
import { ROOT } from './utils.ts'
import type { NormalizedManifest } from '@vltpkg/types'

type Dependency = {
  path: string
  manifest: NormalizedManifest
}

type DependencyWithImporter = Dependency & {
  importer: NormalizedManifest
}

const uniqBy = <T>(arr: T[], key: (t: T) => string): T[] => {
  const seen = new Set<string>()
  return arr.filter(t => {
    const k = key(t)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const getAllProdDeps = async (): Promise<{
  deps: Dependency[]
  depsWithImporter: DependencyWithImporter[]
}> => {
  const config = await Config.load(ROOT, process.argv)
  const mainManifest = config.options.packageJson.read(ROOT)

  const graph = actual.load({
    ...config.options,
    projectRoot: ROOT,
    mainManifest,
    loadManifests: true,
  })

  const q = new Query({
    edges: graph.edges,
    nodes: new Set(graph.nodes.values()),
    importers: graph.importers,
    securityArchive: undefined,
  })

  const { nodes } = await q.search('*:prod:not(:optional)', {
    signal: new AbortController().signal,
  })

  // Get src/** importers
  const srcImporters = new Set(
    [...graph.importers].filter(imp =>
      imp.location.startsWith('./src/'),
    ),
  )

  // Build depsWithImporter by finding which src/** importers each node belongs to
  const depsWithImporter: DependencyWithImporter[] = []

  for (const node of nodes) {
    if (!node.manifest || node.importer) continue

    // Find which src/** importers can reach this node
    for (const srcImporter of srcImporters) {
      if (!srcImporter.manifest) continue
      // Check if this node is reachable from this importer
      const visited = new Set<string>()
      const queue = [...srcImporter.edgesOut.values()]
      let found = false
      /* eslint-disable @typescript-eslint/no-unnecessary-condition */
      while (queue.length > 0 && !found) {
        const edge = queue.shift()
        if (!edge) break
        if (!edge.to || edge.optional || edge.dev) continue
        if (visited.has(edge.to.id)) continue
        visited.add(edge.to.id)
        if (edge.to.id === node.id) {
          found = true
          break
        }
        queue.push(...edge.to.edgesOut.values())
      }
      if (found) {
        depsWithImporter.push({
          path: join(ROOT, node.location),
          manifest: node.manifest,
          importer: srcImporter.manifest,
        })
      }
    }
  }

  const deps = uniqBy(depsWithImporter, d => d.path).map(d => ({
    path: d.path,
    manifest: d.manifest,
  }))

  return { deps, depsWithImporter }
}

const check = <T extends Dependency | DependencyWithImporter>(
  key: string,
  packages: T[],
  value: (d: T) => string | undefined,
  ok: (v: string | undefined, pkg: T) => boolean,
) => {
  const problems = packages.filter(d => !ok(value(d), d))
  if (problems.length) {
    const indent = (n = 0) => `\n${' '.repeat(n)}`
    return (
      `The following dependencies ${key} problems were found:` +
      problems
        .map(
          d =>
            `${indent(2)}${d.manifest.name}@${d.manifest.version}` +
            `${indent(4)}${key}: ${value(d)}` +
            `${indent(4)}path: ${relative(ROOT, d.path)}`,
        )
        .join(indent())
    )
  }
  return undefined
}

const main = async () => {
  const { deps, depsWithImporter } = await getAllProdDeps()

  const checkEngines = check(
    'engines',
    depsWithImporter,
    d => d.manifest.engines?.node,
    (v, d) => {
      if (v === undefined) return true
      if (!d.importer.engines?.node) return false
      return subset(d.importer.engines.node, v)
    },
  )
  const allowedLicenes = new Set([
    'MIT',
    'MIT AND ISC',
    'MIT OR Apache-2.0',
    'ISC',
    'MPL-2.0',
    'BSD-2-Clause-Patent',
    'BlueOak-1.0.0',
    'CC0-1.0',
    'Apache-2.0',
    '0BSD',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'FSL-1.1-MIT',
    '(WTFPL OR MIT)',
    '(MIT OR CC0-1.0)',
    '(BSD-3-Clause OR GPL-2.0)',
    'Unlicense',
  ])
  const checkLicenses = check(
    'license',
    deps,
    d => d.manifest.license,
    v => v === undefined || allowedLicenes.has(v),
  )
  if (checkEngines || checkLicenses) {
    throw new Error(
      [checkEngines, checkLicenses].filter(Boolean).join('\n\n'),
    )
  }
  return (
    `Successfully checked ${deps.length} production dependencies:\n` +
    deps
      .map(d => `${d.manifest.name}@${d.manifest.version} `)
      .sort()
      .join('\n')
  )
}

console.log(await main())
