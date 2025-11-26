import {
  asDepID,
  hydrate,
  joinDepIDTuple,
  joinExtra,
  splitDepID,
  splitExtra,
} from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import { graphStep } from '@vltpkg/output'
import { isObject } from '@vltpkg/types'
import {
  shorten,
  getRawDependencies,
  getDependencies,
} from '../dependencies.ts'
import { Graph } from '../graph.ts'
import { loadHidden } from '../lockfile/load.ts'
import { saveHidden } from '../lockfile/save.ts'
import type { DepID } from '@vltpkg/dep-id'
import type { PackageJson } from '@vltpkg/package-json'
import type { SpecOptions } from '@vltpkg/spec'
import type { NormalizedManifest } from '@vltpkg/types'
import type { Monorepo } from '@vltpkg/workspaces'
import type { Path, PathScurry } from 'path-scurry'
import type { Node } from '../node.ts'
import type {
  GraphModifier,
  ModifierActiveEntry,
} from '../modifiers.ts'
import { readFileSync } from 'node:fs'

export type LoadOptions = SpecOptions & {
  /**
   * The project root dirname.
   */
  projectRoot: string
  /**
   * The project root manifest.
   */
  mainManifest?: NormalizedManifest
  /**
   * The graph modifiers helper object.
   */
  modifiers?: GraphModifier
  /**
   * A {@link Monorepo} object, for managing workspaces
   */
  monorepo?: Monorepo
  /**
   * A {@link PackageJson} object, for sharing manifest caches
   */
  packageJson: PackageJson
  /**
   * A {@link PathScurry} object, for use in globs
   */
  scurry: PathScurry
  /**
   * If set to `false`, `actual.load` will not load any `package.json`
   * files while traversing the file system.
   *
   * The resulting {@link Graph} from loading with `loadManifests=false`
   * has no information on dependency types or the specs defined and
   * no information on missing and extraneous dependencies.
   */
  loadManifests?: boolean
  /**
   * If set to `true`, then do not shortcut the process by reading the
   * hidden lockfile at `node_modules/.vlt-lock.json`
   */
  skipHiddenLockfile?: boolean
  /**
   * Load only importers into the graph if the modifiers have changed.
   */
  skipLoadingNodesOnModifiersChange?: boolean
  // TODO: move the lockfile-related options to a separate type file
  /**
   * If set to `true`, fail if lockfile is missing or out of date.
   * Used by ci command to enforce lockfile integrity.
   */
  expectLockfile?: boolean
  /**
   * If set to `true`, fail if lockfile is missing or out of sync with package.json.
   * Prevents any lockfile modifications and is stricter than expectLockfile.
   */
  frozenLockfile?: boolean
  /**
   * If set to `true`, only update the lockfile without performing any node_modules
   * operations. Skips package extraction, filesystem operations, and hidden lockfile saves.
   */
  lockfileOnly?: boolean
}

export type ReadEntry = {
  alias: string
  name: string
  realpath: Path
}

/**
 * The configuration object type as it is saved in the `.vlt/vlt.json`
 */
export type StoreConfigObject = {
  modifiers: Record<string, string> | undefined
}

/**
 * Checks if a given object is a {@link StoreConfigObject}.
 */
export const isStoreConfigObject = (
  obj: unknown,
): obj is StoreConfigObject =>
  isObject(obj) &&
  Object.prototype.hasOwnProperty.call(obj, 'modifiers') &&
  isObject(obj.modifiers)

/**
 * Returns a {@link StoreConfigObject} from a given object.
 * Throws a TypeError if the object can't be converted.
 */
export const asStoreConfigObject = (
  obj: unknown,
): StoreConfigObject => {
  if (!isStoreConfigObject(obj)) {
    throw new TypeError(`Expected a store config object, got ${obj}`)
  }
  return obj
}

// path-based refer to the types of dependencies that are directly linked to
// their real location in the file system and thus will not have an entry
// in the `node_modules/.vlt` store
const pathBasedType = new Set(['file', 'workspace'])
const isPathBasedType = (
  type: string,
): type is 'file' | 'workspace' => pathBasedType.has(type)

/**
 * Returns a {@link DepID} for a given spec and path, if the spec is
 * path-based or a registry spec, otherwise returns `undefined`.
 */
export const getPathBasedId = (
  spec: Spec,
  path: Path,
): DepID | undefined =>
  isPathBasedType(spec.type) ?
    joinDepIDTuple([spec.type, path.relativePosix()])
  : findDepID(path)

/**
 * Retrieve the {@link DepID} for a given package from its location.
 */
const findDepID = ({ parent, name }: Path): DepID | undefined =>
  parent?.name === '.vlt' ? asDepID(name)
  : parent?.isCWD === false ? findDepID(parent)
  : undefined

/**
 * Retrieves the closest `node_modules` parent {@link Path} found.
 */
const findNodeModules = ({
  parent,
  name,
  isCWD,
}: Path): Path | undefined =>
  parent?.name === 'node_modules' ? parent
  : parent && name !== '.vlt' && !isCWD ? findNodeModules(parent)
  : undefined

/**
 * Retrieves the scoped-normalized package name from its {@link Path}.
 */
const findName = ({ parent, name }: Path): string =>
  parent?.name.startsWith('@') ? `${parent.name}/${name}` : name

/**
 * Helper function that gets a modified {@link Spec} when finding a modifier
 * that applies to a given dependency. Otherwise returns the original spec
 * value and no queryModifier.
 */
const maybeApplyModifierToSpec = (
  spec: Spec,
  depName: string,
  modifierRefs?: Map<string, ModifierActiveEntry>,
): { spec: Spec; queryModifier?: string } => {
  const activeModifier = modifierRefs?.get(depName)
  const queryModifier = activeModifier?.modifier.query
  const completeModifier =
    activeModifier &&
    activeModifier.interactiveBreadcrumb.current ===
      activeModifier.modifier.breadcrumb.last

  if (
    queryModifier &&
    completeModifier &&
    'spec' in activeModifier.modifier
  ) {
    const modifiedSpec = activeModifier.modifier.spec
    modifiedSpec.overridden = true
    return { spec: modifiedSpec, queryModifier }
  }

  return { spec, queryModifier }
}

/**
 * Reads the current directory defined at `currDir` and looks for folder
 * names and their realpath resolution, normalizing scoped package names
 * and removing any invalid symlinks from the list of items that should
 * be parsed through in order to build the graph.
 */
const readDir = (
  scurry: PathScurry,
  currDir: Path,
  fromNodeName?: string,
) => {
  const res = new Set<ReadEntry>()
  for (const entry of scurry.readdirSync(currDir)) {
    // ignore any hidden files / folders
    if (entry.name.startsWith('.')) continue

    // scope folder found, it will need to be read and iterated over
    // in order to find any scoped packages inside
    if (entry.name.startsWith('@')) {
      const scopedItems = readDir(scurry, entry, fromNodeName)
      for (const scopedItem of scopedItems) {
        res.add(scopedItem)
      }
      continue
    }

    // skip anything that isn't a symlink, it's not an edge
    if (!entry.isSymbolicLink()) continue

    // we'll need to learn what is the real path for this entry in order
    // to retrieve the `location` and `id` properties for the node, if a
    // realpath is not found just move on to the next element
    const realpath = entry.realpathSync()
    if (!realpath) {
      continue
    }

    // infer both the alias and proper package names, including scopes
    const alias = findName(entry)
    const name = findName(realpath)
    res.add({
      alias,
      name,
      realpath,
    })
  }
  return res
}

/**
 * Parses the files located at `currDir` and place packages found inside
 * as dependencies of `fromNode`, building the instantiated `graph`.
 */
const parseDir = (
  options: LoadOptions,
  scurry: PathScurry,
  packageJson: PackageJson,
  depsFound: Map<Node, Path>,
  graph: Graph,
  fromNode: Node,
  currDir: Path,
) => {
  const { loadManifests, modifiers } = options
  const dependencies = getRawDependencies(fromNode)
  const seenDeps = new Set<string>()
  const readItems: Set<ReadEntry> = readDir(
    scurry,
    currDir,
    fromNode.name,
  )

  // Get modifier references for this node's dependencies
  const modifierRefs = modifiers?.tryDependencies(fromNode, [
    ...getDependencies(fromNode, options).values(),
  ])

  for (const { alias, name, realpath } of readItems) {
    let node

    // tracks what dependencies have been seen
    // so that we can mark missing dependencies
    seenDeps.add(alias)

    // places the package in the graph reading
    // its manifest only if necessary
    if (!loadManifests) {
      const depId = findDepID(realpath)

      if (depId) {
        let h = hydrate(depId, alias, {
          ...options,
        })
        // if the parsed registry value is using the default value, then
        // the node should inherit the registry value from its parent node
        h.inheritedRegistry = fromNode.registry

        // Check for active modifiers and replace spec even when not loading manifests
        const { spec: modifiedSpec, queryModifier } =
          maybeApplyModifierToSpec(h, alias, modifierRefs)
        h = modifiedSpec

        // graphs build with no manifest have no notion of
        // dependency types and or spec definitions since those
        // would have to be parsed from a manifest
        node = graph.placePackage(
          fromNode,
          'prod', // defaults to prod deps
          h, // uses spec from hydrated id
          {
            name,
          },
          depId,
          joinExtra({ modifier: queryModifier }),
        )

        // Update active entry after placing package
        const activeModifier = modifierRefs?.get(alias)
        if (activeModifier && node) {
          modifiers?.updateActiveEntry(node, activeModifier)
        }
      }
    }

    // retrieve references to the current folder name found in `fromNode`
    // manifest listed dependencies, removing it from the map will leave
    // a list of missing dependencies at the end of the iteration
    const deps = dependencies.get(alias)

    // in case this graph is skipping manifests, this next block might
    // still need to execute, thus actually loading a manifest file, for
    // edge-cases such as loading a linked node that is not going to have
    // DepID info available in its realpath or extraneous nodes
    if (!node) {
      const mani = packageJson.read(realpath.fullpath())
      // declares fallback default values for both depType and bareSpec
      // in order to support loadManifests=false fallback for link nodes
      const type = deps?.type || 'dependencies'
      const bareSpec = deps?.bareSpec || '*'

      const depType = shorten(type, alias, fromNode.manifest)
      let spec = Spec.parse(alias, bareSpec, {
        ...options,
      })
      // if the parsed registry value is using the default value, then
      // the node should inherit the registry value from its parent node
      spec.inheritedRegistry = fromNode.registry

      // Check for active modifiers and replace spec if a modifier is complete
      const { spec: modifiedSpec, queryModifier } =
        maybeApplyModifierToSpec(spec, alias, modifierRefs)
      spec = modifiedSpec

      const maybeId = getPathBasedId(spec, realpath)
      let peerSetHash: string | undefined
      if (maybeId) {
        // parses extra info from depID to retrieve peerSetHash
        try {
          const tuple = splitDepID(maybeId)
          const type = tuple[0]
          const extra =
            type === 'registry' || type === 'git' ?
              tuple[3]
            : tuple[2]

          peerSetHash =
            extra ? splitExtra(extra).peerSetHash : undefined
          /* c8 ignore next - impossible: getPathBasedId asserts valid dep id */
        } catch {}
      }
      node = graph.placePackage(
        fromNode,
        depType,
        spec,
        mani,
        maybeId,
        joinExtra({ modifier: queryModifier, peerSetHash }),
      )

      // Update active entry after placing package
      const activeModifier = modifierRefs?.get(alias)
      if (activeModifier && node) {
        modifiers?.updateActiveEntry(node, activeModifier)
      }
    }

    if (node) {
      // If a found dependency is not declared in any of the original
      // node dependencies, then add an edge to the graph pointing to it
      // and mark it as extraneous.
      //
      // This only makes sense if full manifests are being loaded
      // so that we have reference to dependencies info.
      if (loadManifests && !deps) {
        const [edge] = node.edgesIn
        if (edge) {
          graph.extraneousDependencies.add(edge)
        }
      }

      // for a succesfully created node, add its location
      // property and queue up to read its dependencies
      node.location = `./${realpath.relativePosix()}`
      const node_modules = findNodeModules(realpath)

      // queue items up to continue parsing dirs in case a node was succesfully
      // placed in the graph and its node_modules folder was correctly found
      if (node_modules) {
        depsFound.set(node, node_modules)
      }
    }
  }

  // any remaining dependencies that have not been found
  // when reading the directory should be marked as missing
  for (const { name, type, bareSpec } of dependencies.values()) {
    if (!seenDeps.has(name)) {
      const depType = shorten(type, name, fromNode.manifest)
      let spec = Spec.parse(name, bareSpec, {
        ...options,
      })
      // if the parsed registry value is using the default value, then
      // the node should inherit the registry value from its parent node
      spec.inheritedRegistry = fromNode.registry

      // Check for active modifiers and replace spec for missing dependencies
      const { spec: modifiedSpec, queryModifier } =
        maybeApplyModifierToSpec(spec, name, modifierRefs)
      spec = modifiedSpec

      graph.placePackage(
        fromNode,
        depType,
        spec,
        undefined,
        undefined,
        joinExtra({ modifier: queryModifier }),
      )
    }
  }
}

/**
 * Read the file system looking for `node_modules` folders and
 * returns a new {@link Graph} that represents the relationship
 * between the dependencies found.
 */
export const load = (options: LoadOptions): Graph => {
  const done = graphStep('actual')
  const {
    modifiers,
    monorepo,
    projectRoot,
    packageJson,
    scurry,
    skipHiddenLockfile = false,
    skipLoadingNodesOnModifiersChange = false,
  } = options
  const mainManifest =
    options.mainManifest ?? packageJson.read(projectRoot)

  if (!skipHiddenLockfile) {
    try {
      // if we reach here, the hidden lockfile is valid
      const graph = loadHidden({
        ...options,
        projectRoot,
        mainManifest,
        packageJson,
        monorepo,
        scurry,
      })
      done()
      return graph
    } catch {
      // if validation fails or any other error occurs,
      // fall back to filesystem traversal
    }
  }

  const graph = new Graph({ ...options, mainManifest })

  // retrieve the configuration object from the store
  let storeConfig: StoreConfigObject = { modifiers: undefined }
  try {
    storeConfig = asStoreConfigObject(
      JSON.parse(
        readFileSync(
          scurry.resolve('node_modules/.vlt/vlt.json'),
          'utf8',
        ),
      ),
    )
  } catch {}
  const storeModifiers = JSON.stringify(storeConfig.modifiers ?? {})
  const optionsModifiers = JSON.stringify(modifiers?.config)
  const modifiersChanged = storeModifiers !== optionsModifiers
  const shouldLoadDependencies = !(
    skipLoadingNodesOnModifiersChange && modifiersChanged
  )

  // will only skip loading dependencies if the
  // skipLoadingNodesOnModifiersChange option is set to true
  // and the current modifiers have not changed when compared
  // to the modifiers stored in the `node_modules/.vlt/vlt.json` store config
  if (shouldLoadDependencies) {
    const depsFound = new Map<Node, Path>()

    // starts the list of initial folders to parse using the importer nodes
    for (const importer of graph.importers) {
      modifiers?.tryImporter(importer)
      depsFound.set(
        importer,
        scurry.cwd.resolve(`${importer.location}/node_modules`),
      )
    }

    // breadth-first traversal of the file system tree reading deps found
    // starting from the node_modules folder of every importer in order to
    // find the actual installed dependencies at each location
    for (const [node, path] of depsFound.entries()) {
      parseDir(
        options,
        scurry,
        packageJson,
        depsFound,
        graph,
        node,
        path,
      )
    }

    // Clean up any pending modifier entries that were never completed
    modifiers?.rollbackActiveEntries()

    // caches the load result to the hidden lockfile when enabled
    if (
      scurry.cwd.resolve('node_modules').lstatSync()?.isDirectory()
    ) {
      saveHidden({
        ...options,
        graph,
      })
    }
  }

  done()

  return graph
}
