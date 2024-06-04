import { DepID, asDepID, hydrate } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { Path, PathScurry } from 'path-scurry'
import { Graph, ManifestInventory } from '../graph.js'
import { Node } from '../node.js'
import {
  DependencyTypeLong,
  dependencyTypes,
} from '../dependencies.js'

export type LoadOptions = {
  /**
   * The project root dirname.
   */
  dir: string
  /**
   * An inventory of seen manifests.
   */
  manifests?: ManifestInventory
  /**
   * A {@link Monorepo} object, for managing workspaces
   */
  monorepo?: Monorepo
  /**
   * A {@link PackageJson} object, for sharing manifest caches
   */
  packageJson?: PackageJson
  /**
   * A {@link PathScurry} object, for use in globs
   */
  scurry?: PathScurry
  /**
   * Do not load any `package.json` files while traversing the file system.
   *
   * The resulting {@link Graph} from loading with `loadManifests=false` has no
   * information on dependency types or the specs defined and no information
   * on missing and extraneous dependencies.
   */
  loadManifests?: boolean
}

export interface DependencyEntry {
  depType: DependencyTypeLong
  bareSpec: string
}

export interface ReadEntry {
  alias: string
  name: string
  realpath: Path
}

export interface NextItems {
  node: Node
  node_modules: Path
}

/**
 * Retrieve the {@link DepID} for a given package from its location.
 */
const findDepID = (entry: Path): DepID | undefined => {
  if (!entry.parent) {
    return
  }
  if (entry.parent.name === '.vlt') {
    return asDepID(entry.name)
  } else if (!entry.parent.isCWD) {
    return findDepID(entry.parent)
  }
}

/**
 * Retrieves the closest `node_modules` parent {@link Path} found.
 */
const findNodeModules = (entry: Path): Path | undefined => {
  if (!entry.parent) {
    return
  }
  if (entry.parent.name === 'node_modules') {
    return entry.parent
  } else if (entry.name !== '.vlt' && !entry.isCWD) {
    return findNodeModules(entry.parent)
  }
}

const findName = (entry: Path): string =>
  entry.parent?.name.startsWith('@') ?
    `${entry.parent.name}/${entry.name}`
  : entry.name

/**
 * Read the file system looking for `node_modules` folders and
 * returns a new {@link Graph} that represents the relationship
 * between the dependencies found.
 */
export const load = (
  options: LoadOptions,
  config: SpecOptions,
): Graph => {
  const packageJson = options.packageJson ?? new PackageJson()
  const mainManifest = packageJson.read(options.dir)
  const scurry = options.scurry ?? new PathScurry(options.dir)
  const monorepo =
    options.monorepo ??
    Monorepo.maybeLoad(options.dir, { packageJson, scurry })
  const graph = new Graph(
    { mainManifest, manifests: options.manifests, monorepo },
    config,
  )
  const { loadManifests } = options
  const specOptions = config as SpecOptions
  const depsCache: Map<Node, Map<string, DependencyEntry>> = new Map()

  /*
   * Retrieves a map of all dependencies, of all types, that can be iterated
   * on and consulted when reading the directory of the current node, results
   * are stored in a map so that it's ever only calculated once per node
   */
  const getDeps = (node: Node) => {
    const cached = depsCache.get(node)
    /* c8 ignore next 3 */
    if (cached) {
      return cached
    }
    const dependencies = new Map<string, DependencyEntry>()
    const types = dependencyTypes.keys()
    for (const depType of types) {
      const obj: Record<string, string> | undefined =
        node.manifest?.[depType]
      if (obj) {
        for (const [name, bareSpec] of Object.entries(obj)) {
          dependencies.set(name, { depType, bareSpec })
        }
      }
    }
    depsCache.set(node, dependencies)
    return dependencies
  }

  /**
   * Reads the current directory defined at `currDir` and looks for folder
   * names and their realpath resolution, normalizing scoped package names
   * and removing any invalid symlinks from the list of items that should
   * be parsed through in order to build the graph
   */
  const readDir = (currDir: Path, fromNodeName?: string) => {
    const res: Set<ReadEntry> = new Set()
    for (const entry of scurry.readdirSync(currDir)) {
      // ignore any hidden files / folders
      if (entry.name.startsWith('.')) continue

      // scope folder found, it will need to be read and iterated over
      // in order to find any scoped packages inside
      if (entry.name.startsWith('@')) {
        const scopedItems = readDir(entry, fromNodeName)
        for (const scopedItem of scopedItems) {
          res.add(scopedItem)
        }
        continue
      }

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

      // skips reading from the package's own folder
      if (name === fromNodeName) continue

      res.add({
        alias,
        name,
        realpath,
      })
    }
    return res
  }

  /**
   * Walks over the files located at `currDir` and place packages found
   * inside as dependencies of `fromNode` building the instantiated `graph`
   */
  const walk = (fromNode: Node, currDir: Path) => {
    const dependencies = getDeps(fromNode)
    const nextItems: Set<NextItems> = new Set()
    const seenDeps: Set<string> = new Set()
    const readItems: Set<ReadEntry> = readDir(currDir, fromNode.name)

    for (const { alias, name, realpath } of readItems) {
      // tracks what dependencies have been seen
      seenDeps.add(alias)

      // places the package in the graph reading
      // its manifest only if necessary
      let node
      if (!loadManifests) {
        const depId = findDepID(realpath)

        if (depId) {
          const h = hydrate(depId, alias, specOptions)

          // graphs build with no manifest have no notion of
          // dependency types and or spec definitions since those
          // would have to be parsed from a manifest
          node = graph.placePackage(
            fromNode,
            'dependencies', // defaults to prod deps
            h, // uses spec from hydrated id
            {
              name,
              ...(h.registrySpec ?
                { version: h.registrySpec } // adds version if available
              : null),
            },
            depId,
          )
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
        const depType = deps?.depType || 'dependencies'
        const bareSpec = deps?.bareSpec || '*'

        const spec = Spec.parse(alias, bareSpec, specOptions)
        node = graph.placePackage(fromNode, depType, spec, mani)
      }

      // for a succesfully created node, add its location property
      // and queue up to recursively read its dependencies
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

        node.location = `./${realpath.relativePosix()}`
        const node_modules = findNodeModules(realpath)

        // queue items up to recursively walk in case a node was succesfully
        // placed in the graph and its node_modules folder was correctly found
        if (node_modules) {
          nextItems.add({
            node,
            node_modules,
          })
        }
      }
    }

    // any remaining dependencies that have not been found
    // when reading the directory should be marked as missing
    for (const [name, dep] of dependencies.entries()) {
      if (!seenDeps.has(name)) {
        const { depType, bareSpec } = dep
        const spec = Spec.parse(name, bareSpec, specOptions)
        graph.placePackage(fromNode, depType, spec)
      }
    }

    // breadth-first recursive traversal of dependencies
    for (const { node, node_modules } of nextItems) {
      walk(node, node_modules)
    }
  }

  // walks over the node_modules folder of each importer in order to find
  // the actual installed dependencies at the given `dir` location
  for (const importer of graph.importers) {
    walk(
      importer,
      scurry.cwd.resolve(`${importer.location}/node_modules`),
    )
  }

  return graph
}
