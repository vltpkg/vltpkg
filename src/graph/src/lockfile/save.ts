import {
  expandNormalizedManifestSymbols,
  isRecordStringString,
} from '@vltpkg/types'
import {
  defaultGitHostArchives,
  defaultGitHosts,
  defaultJsrRegistries,
  defaultRegistries,
  defaultRegistry,
  defaultScopeRegistries,
} from '@vltpkg/spec'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { getFlagNumFromNode, getBuildStateFromNode } from './types.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import type { Edge } from '../edge.ts'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'
import type {
  LockfileData,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileEdgeValue,
  LockfileNode,
  LockfilePlatform,
} from './types.ts'
import type { GraphModifier } from '../modifiers.ts'
import { error } from '@vltpkg/error-cause'

export type SaveOptions = SpecOptions & {
  /**
   * The graph to be stored in the lockfile.
   */
  graph: Graph
  /**
   * The graph modifiers helper object.
   */
  modifiers?: GraphModifier
  /**
   * Should it save manifest data in the lockfile?
   */
  saveManifests?: boolean
  /**
   * Should it save build state data in the lockfile?
   */
  saveBuildData?: boolean
  /**
   * Should it throw an error if a manifest is missing?
   */
  throwOnMissingManifest?: boolean
}

const formatNodes = (
  nodes: Iterable<Node>,
  saveManifests?: boolean,
  saveBuildData?: boolean,
  registry?: string,
  throwOnMissingManifest?: boolean,
) => {
  // we do not store importers in the lockfile, though we do store
  // their edges. when we load, we always read workspaces/main fresh.
  const arr: Node[] = [...nodes].filter(node => !node.importer)
  // nodes are sorted in order to have a deterministic result
  const orderedNodes: Node[] = arr.sort((a, b) =>
    a.id.localeCompare(b.id, 'en'),
  )

  const res: Record<DepID, LockfileNode> = {}
  for (const node of orderedNodes) {
    const customRegistry =
      node.resolved && registry && !node.resolved.startsWith(registry)
    const resolved = customRegistry ? node.resolved : undefined
    // if it's in a location other than the default, stash that
    const location =
      node.id.startsWith('file') || node.inVltStore() ?
        undefined
      : node.location

    const flags = getFlagNumFromNode(node)
    const lockfileNode: LockfileNode = [flags, node.name]

    if (node.integrity) {
      lockfileNode[2] = node.integrity
    }

    if (resolved) {
      lockfileNode[3] = resolved
    }

    if (location) {
      lockfileNode[4] = location
    }

    if (saveManifests && node.manifest) {
      lockfileNode[5] = expandNormalizedManifestSymbols(node.manifest)

      if (node.confused && node.rawManifest) {
        lockfileNode[6] = expandNormalizedManifestSymbols(
          node.rawManifest,
        )
      }
    }

    // Throw an error if a manifest is missing and the option is enabled
    if (throwOnMissingManifest && !node.manifest) {
      throw error(`Missing manifest for node ${node.id}.`)
    }

    // Always save platform data for optional dependencies if available
    if (node.optional && node.platform) {
      lockfileNode[7] = node.platform as LockfilePlatform
    }

    // Save bin data if available
    if (node.bins && Object.keys(node.bins).length) {
      lockfileNode[8] = node.bins
    }

    // Save build state data if requested
    if (saveBuildData) {
      const buildState = getBuildStateFromNode(node)
      if (buildState !== undefined) {
        lockfileNode[9] = buildState
      }
    }

    res[node.id] = lockfileNode
  }
  return res
}

const formatEdges = (edges: Set<Edge>): LockfileEdges =>
  Object.fromEntries(
    [...edges]
      .sort(
        (a, b) =>
          /* c8 ignore start - nondeterminstic and annoying to test */
          // sort importers to the top, then alphabetically by
          // id, type, target
          Number(b.from.importer) - Number(a.from.importer) ||
          a.from.id.localeCompare(b.from.id, 'en') ||
          a.type.localeCompare(b.type, 'en') ||
          (a.to?.id ?? '').localeCompare(b.to?.id ?? ''),
        /* c8 ignore stop */
      )
      .map((edge): [LockfileEdgeKey, LockfileEdgeValue] => [
        `${edge.from.id} ${edge.spec.name}`,
        `${edge.type} ${edge.spec.bareSpec || '*'} ${edge.to?.id ?? 'MISSING'}`,
      ]),
  )

const removeDefaultItems = (
  defaultItems: Record<string, string>,
  items: Record<string, string>,
) => {
  const res: Record<string, string> = {}
  for (const [key, value] of Object.entries(items)) {
    if (!defaultItems[key] || defaultItems[key] !== value) {
      res[key] = value
    }
  }
  return res
}

export const lockfileData = ({
  graph,
  catalog,
  catalogs,
  'git-hosts': gitHosts,
  'git-host-archives': gitHostArchives,
  modifiers,
  registry,
  registries,
  saveManifests,
  saveBuildData,
  'scope-registries': scopeRegistries,
  'jsr-registries': jsrRegistries,
  throwOnMissingManifest,
}: SaveOptions): LockfileData => {
  const cleanGitHosts =
    isRecordStringString(gitHosts) ?
      removeDefaultItems(defaultGitHosts, gitHosts)
    : undefined
  const cleanGitHostArchives =
    isRecordStringString(gitHostArchives) ?
      removeDefaultItems(defaultGitHostArchives, gitHostArchives)
    : undefined
  const cleanModifiers =
    modifiers && isRecordStringString(modifiers.config) ?
      modifiers.config
    : undefined
  const cleanRegistries =
    isRecordStringString(registries) ?
      removeDefaultItems(defaultRegistries, registries)
    : undefined
  const cleanScopeRegistries =
    isRecordStringString(scopeRegistries) ?
      removeDefaultItems(defaultScopeRegistries, scopeRegistries)
    : undefined
  const cleanJsrRegistries =
    isRecordStringString(jsrRegistries) ?
      removeDefaultItems(defaultJsrRegistries, jsrRegistries)
    : undefined
  const hasItems = (clean: Record<string, unknown> | undefined) =>
    clean && Object.keys(clean).length
  return {
    lockfileVersion: 0,
    options: {
      ...(hasItems(cleanModifiers) ?
        { modifiers: cleanModifiers }
      : {}),
      ...(hasItems(catalog) ? { catalog } : {}),
      ...(hasItems(catalogs) ? { catalogs } : {}),
      ...(hasItems(cleanScopeRegistries) ?
        { 'scope-registries': cleanScopeRegistries }
      : undefined),
      ...(hasItems(cleanJsrRegistries) ?
        { 'jsr-registries': cleanJsrRegistries }
      : undefined),
      ...(registry !== undefined && registry !== defaultRegistry ?
        { registry }
      : undefined),
      ...(hasItems(registries) ?
        { registries: cleanRegistries }
      : undefined),
      ...(hasItems(cleanGitHosts) ?
        { 'git-hosts': cleanGitHosts }
      : undefined),
      ...(hasItems(cleanGitHostArchives) ?
        { 'git-host-archives': cleanGitHostArchives }
      : undefined),
    },
    nodes: formatNodes(
      graph.nodes.values(),
      saveManifests,
      saveBuildData,
      registry,
      throwOnMissingManifest,
    ),
    edges: formatEdges(graph.edges),
  }
}

// renders each node / edge as a single line entry
const extraFormat = (jsonString: string) => {
  const str = `${jsonString}\n`
  const [init, ...parts] = str.split('  "nodes": {')
  const res = [init]
  for (const part of parts) {
    res.push(
      part.replaceAll('\n      ', '').replaceAll('\n    ]', ']'),
    )
  }
  return res.join('  "nodes": {')
}

export const saveData = (
  data: LockfileData,
  fileName: string,
  saveManifests = false,
): void => {
  const json = JSON.stringify(data, null, 2)
  const content = saveManifests ? json : extraFormat(json)
  writeFileSync(fileName, content)
}

export const save = (
  options: Omit<SaveOptions, 'saveManifests'>,
): void => {
  const { graph } = options
  const data = lockfileData({ ...options, saveManifests: false })
  const fileName = resolve(graph.projectRoot, 'vlt-lock.json')
  saveData(data, fileName, false)
}

export const saveHidden = (
  options: Omit<SaveOptions, 'saveManifests' | 'saveBuildData'>,
): void => {
  const { graph } = options
  let data: LockfileData | undefined

  try {
    data = lockfileData({
      ...options,
      saveManifests: true,
      saveBuildData: true,
      throwOnMissingManifest: true,
    })
  } catch {}

  if (!data) return

  const fileName = resolve(
    graph.projectRoot,
    'node_modules/.vlt-lock.json',
  )
  mkdirSync(dirname(fileName), { recursive: true })
  saveData(data, fileName, true)
}
