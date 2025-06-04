import { parseBreadcrumb } from '@vltpkg/dss-breadcrumb'
import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { asManifest, assertManifest, isObject } from '@vltpkg/types'
import { load } from '@vltpkg/vlt-json'
import type {
  ModifierBreadcrumb,
  ModifierInteractiveBreadcrumb,
} from '@vltpkg/dss-breadcrumb'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import type { Edge } from './edge.ts'
import type { Node } from './node.ts'

/**
 * Loaded modifiers configuration as described in the `vlt.json` file.
 */
export type GraphModifierLoadedConfig = {
  modifiers: GraphModiferConfig
}

/**
 * Allowed datatype in the `modifiers` field of the `vlt.json` file.
 */
export type GraphModiferConfig = Record<
  string,
  string | Record<string, any>
>

/**
 * Type definition for the modifiers configuration object
 */
export type GraphModifierConfigObject = Record<
  string,
  string | Manifest
>

/**
 * Turn a {@link GraphModiferConfig} into a
 * {@link GraphModifierConfigObject}, or throw if it's not valid.
 */
export const asGraphModifiersConfig = (
  conf: unknown,
  path?: string,
): GraphModifierConfigObject => {
  assertGraphModifiersConfig(conf, path)

  // Convert to standardized format
  const result: GraphModifierConfigObject = {}

  for (const [key, value] of Object.entries(conf)) {
    if (typeof value === 'string') {
      result[key] = value
    } else {
      result[key] = asManifest(value)
    }
  }

  return result
}

/**
 * Throw if the provided value is not a valid {@link GraphModiferConfig}
 */
export const assertGraphModifiersConfig: (
  conf: unknown,
  path?: string,
) => asserts conf is GraphModiferConfig = (
  conf: unknown,
  path?: string,
) => {
  if (!isObject(conf) || Array.isArray(conf)) {
    throw error('Invalid modifiers configuration', {
      path,
      found: conf,
    })
  }

  for (const [key, value] of Object.entries(conf)) {
    if (typeof value === 'string') {
      // String values are valid as they represent edge modifiers
      continue
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Object values need to be valid manifests
      try {
        assertManifest(value)
      } catch (err) {
        throw error('Invalid modifier manifest', {
          path,
          name: key,
          found: value,
          wanted: 'Valid package manifest',
          cause: err,
        })
      }
    } else {
      throw error('Invalid modifier value', {
        path,
        name: key,
        found: value,
        wanted: 'string | Manifest',
      })
    }
  }
}

/**
 * Info needed to define a graph modifier.
 */
export type BaseModifierEntry = {
  type: 'edge' | 'node'
  query: string
  breadcrumb: ModifierBreadcrumb
  value: string | Manifest
  refs: Set<{
    name: string
    from: Node
  }>
}

/**
 * Extra info to define specifically a graph edge modifier.
 */
export type EdgeModifierEntry = BaseModifierEntry & {
  type: 'edge'
  spec: Spec
  value: string
}

/**
 * Extra info to define the graph node modifier.
 */
export type NodeModifierEntry = BaseModifierEntry & {
  type: 'node'
  manifest: Manifest
}

/**
 * A graph modifier entry, which can be either an edge or a node modifier.
 */
export type ModifierEntry = EdgeModifierEntry | NodeModifierEntry

/**
 * An object to track modifiers that have matched an initial part of the
 * breadcrumb. It holds pointers to both nodes and edges matched in the
 * current traversed graph on top of the modifier info and the breadcrumb
 * state that is used to track the current state of the parsing.
 */
export type ModifierActiveEntry = {
  /**
   * The modifier this active entry is working with.
   */
  modifier: ModifierEntry
  /**
   * The breadcrumb that is used to track the current state of the parsing.
   */
  interactiveBreadcrumb: ModifierInteractiveBreadcrumb
  /**
   * The first node to be affected by this modifier.
   */
  originalFrom: Node
  /**
   * The original edge that is being replaced with this entry.
   */
  originalEdge?: Edge
  /**
   * The modified edge that is being used to replace the original edge.
   */
  modifiedEdge?: Edge
}

/**
 * Options for the GraphModifier class constructor
 */
export type GraphModifierOptions = {
  /**
   * A {@link PackageJson} object, for sharing manifest caches
   */
  packageJson?: PackageJson
  /**
   * Options for the {@link Spec} parser
   */
  specOptions?: SpecOptions
  /**
   * Parsed normalized contents of the modifiers from a `vlt.json` file
   */
  config?: GraphModifierConfigObject
}

/**
 * Class representing loaded modifiers configuration for a project.
 *
 * Instances of this class can be used as a helper to modify the graph
 * during the graph build ideal traversal time.
 *
 * ```
 * const modifier = new GraphModifier(options)
 * modifier.load(options)
 * ```
 *
 * The `tryImporter` method can be used to register the initial importer
 * node along with any modifier that includes an importer selector, e.g:
 * `modifier.tryImporter(graph.mainImporter)`
 *
 * When traversing the graph, use the `tryNewDependency` method to check
 * if a given dependency name to the current traversed node has matching
 * registered modifiers, e.g:
 * `const entries = modifier.tryNewDependency(fromNode, depName)`
 *
 * Use `updateActiveEntry` to update a given active modifier entry state
 * with the current node of the graph being traversed. e.g:
 * ```
 * for (const entry of entries)
 *   modifier.updateActiveEntry(fromNode, entry)
 * ```
 */
export class GraphModifier {
  /** The package.json object, for sharing manifest caches */
  packageJson: PackageJson
  /** The loaded modifiers configuration */
  #config?: GraphModifierConfigObject
  /** A set of all modifiers loaded from vlt.json */
  #modifiers = new Set<ModifierEntry>()
  /** A set of all edge modifiers loaded from vlt.json */
  #edgeModifiers = new Set<EdgeModifierEntry>()
  /** A set of all node modifiers loaded from vlt.json */
  #nodeModifiers = new Set<NodeModifierEntry>()
  /**
   * A map of initial entries, keyed by the name of the first breadcrumb
   * item to its modifier entry. Useful for checking for non-importer
   * starting breadcrumbs, e.g: `#a > #b`
   */
  #initialEntries = new Map<string, Set<ModifierEntry>>()
  /**
   * A multi-level map of active entries, keyed by:
   * - modifiers
   * - edge name
   * - from node
   * that allows for retrieving seen {@link ModifierActiveEntry} instances
   * in constant time.
   */
  #activeEntries = new Map<
    ModifierEntry,
    Map<string, Map<Node, ModifierActiveEntry>>
  >()

  /**
   * A set of currently active modifiers, which are being parsed.
   */
  activeModifiers = new Set<ModifierActiveEntry>()

  constructor(options: GraphModifierOptions) {
    this.packageJson = options.packageJson ?? new PackageJson()
    this.load(options)
  }

  /**
   * Load the modifiers definitions from vlt.json,
   * converting the result into a GraphModifierConfigObject
   */
  get config(): GraphModifierConfigObject {
    if (this.#config) return this.#config
    this.#config = asGraphModifiersConfig(
      load('modifiers', assertGraphModifiersConfig) ?? {},
    )
    return this.#config
  }

  /**
   * Loads the modifiers defined in `vlt.json` into memory.
   */
  load(options: GraphModifierOptions) {
    for (const [key, value] of Object.entries(this.config)) {
      const breadcrumb = parseBreadcrumb(key)
      /* c8 ignore start - should not be possible */
      if (!breadcrumb.last.name) {
        throw error('Could not find name in breadcrumb', {
          found: key,
        })
      }
      /* c8 ignore stop */
      let mod: ModifierEntry
      if (typeof value === 'string') {
        mod = {
          breadcrumb,
          query: key,
          refs: new Set(),
          spec: Spec.parse(
            breadcrumb.last.name,
            value,
            options.specOptions,
          ),
          type: 'edge',
          value,
        } satisfies EdgeModifierEntry
        this.#edgeModifiers.add(mod)
      } else {
        const manifest = asManifest(value)
        mod = {
          breadcrumb,
          query: key,
          manifest,
          refs: new Set(),
          type: 'node',
          value: manifest,
        } satisfies NodeModifierEntry
        this.#nodeModifiers.add(mod)
      }
      this.#modifiers.add(mod)
      // if the breadcrumb starts with an id, then add it to the
      // map of initial entries, so that we can use it to match
      if (breadcrumb.first.name) {
        const initialSet =
          this.#initialEntries.get(breadcrumb.first.name) ?? new Set()
        initialSet.add(mod)
        this.#initialEntries.set(breadcrumb.first.name, initialSet)
      }
    }
  }

  /**
   * Check if a given importer dependency name has potentially a registered
   * modifier. In case of an ambiguous modifier, the method will always
   * return `true`, it only returns `false` in the case that only fully
   * qualified modifiers are registered and none are targeting the given
   * top-level dependency name.
   *
   * This method is useful to help avoiding traversing the sub graph of
   * a direct dependency when we know that it's impossible to ever match
   * beforehand.
   */
  maybeHasModifier(depName: string): boolean {
    for (const mod of this.#modifiers) {
      const matchingName =
        mod.breadcrumb.first.importer &&
        mod.breadcrumb.first.next?.name === depName
      const rootlessBreadcrumb = !mod.breadcrumb.first.importer
      if (rootlessBreadcrumb || matchingName) {
        return true
      }
    }
    return false
  }

  /**
   * Try matching the provided node against the top-level selectors. In case
   * a match is found it will also register the active entry modifier and
   * update the active entry to the current importer node.
   */
  tryImporter(importer: Node) {
    for (const modifier of this.#modifiers) {
      // if the first item in the breadcrumb is an importer and it matches
      // any of the valid top-level selectors, then register the modifier
      const { first } = modifier.breadcrumb
      const matchRoot =
        first.value === ':root' && importer.mainImporter
      const matchWorkspace =
        first.value === ':workspace' && importer.importer
      const matchAny =
        first.value === ':project' || matchRoot || matchWorkspace
      if (first.importer && matchAny) {
        const active = this.newModifier(importer, modifier)
        const single = active.modifier.breadcrumb.single
        // only the importers will update the active entry right after
        // registering it since tryImporter doesn't try to match from
        // active dependencies
        if (!single) {
          this.updateActiveEntry(importer, active)
        }
      }
    }
  }

  /**
   * Try matching the provided node and dependency name to the current
   * active parsing modifier entries along with possible starting-level
   * modifiers.
   *
   * Any entries found are returned as a set of {@link ModifierActiveEntry}.
   *
   * This method works with the assumption that it's going to be called
   * during a graph traversal, such that any ascendent has been checked
   * and the active modifier entry state has been updated in the previous
   * iteration.
   */
  tryNewDependency(
    from: Node,
    name: string,
  ): Set<ModifierActiveEntry> {
    const res = new Set<ModifierActiveEntry>()
    for (const modifier of this.#modifiers) {
      // if an active entry is found then returns that
      const entry = this.#activeEntries
        .get(modifier)
        ?.get(name)
        ?.get(from)
      if (entry) {
        res.add(entry)
      }
    }
    // matches the name against the initial entries, this will make it so
    // that modifier queries that start with a name (e.g: #a > #b) can
    // match at any point of the graph traversal
    const initialSet =
      this.#initialEntries.get(name) ?? new Set<ModifierEntry>()
    for (const initial of initialSet) {
      const initialEntry =
        /* c8 ignore next - difficult to test branch */
        this.#activeEntries.get(initial)?.get(name)?.get(from) ??
        this.newModifier(from, initial)
      res.add(initialEntry)
    }
    return res
  }

  /**
   * Updates an active entry state keeping track of items in the multi-level
   * active entries map. If the current breadcrumb state shows there's no more
   * items left, then we deregister the modifier.
   */
  updateActiveEntry(from: Node, active: ModifierActiveEntry): void {
    const { modifier } = active
    const interactiveBreadcrumb = active.interactiveBreadcrumb.next()
    const name = interactiveBreadcrumb.current?.name

    // if there's no name, or we're done parsing then we
    // deregister the modifier instead of updating the entry
    if (interactiveBreadcrumb.done || !name) {
      this.deregisterModifier(modifier)
      return
    }

    // register the active modifier
    this.activeModifiers.add(active)
    active.modifier.refs.add({ from, name })

    // optionally read or create the nested maps
    const nameMap =
      this.#activeEntries.get(modifier) ??
      new Map<string, Map<Node, ModifierActiveEntry>>()
    this.#activeEntries.set(modifier, nameMap)
    const nodeMap =
      nameMap.get(name) ?? new Map<Node, ModifierActiveEntry>()
    nameMap.set(name, nodeMap)

    // sets the active entry in the map
    nodeMap.set(from, active)
  }

  /**
   * Creates a new active modifier.
   */
  newModifier(
    from: Node,
    modifier: ModifierEntry,
  ): ModifierActiveEntry {
    return {
      modifier,
      interactiveBreadcrumb: modifier.breadcrumb.interactive(),
      originalFrom: from,
    }
  }

  /**
   * Removes a previously registered modifier from the active entries.
   */
  deregisterModifier(modifier: ModifierEntry): void {
    for (const { from, name } of modifier.refs) {
      const nodeMap = this.#activeEntries.get(modifier)?.get(name)
      if (nodeMap) {
        // if an entry is found, we remove it from the active set
        const entry = nodeMap.get(from)
        if (entry) {
          this.activeModifiers.delete(entry)
        }
        // then we remove the entry from the map
        nodeMap.delete(from)
        // if the map is empty, we remove it from the active entries map
        if (!nodeMap.size) {
          this.#activeEntries.get(modifier)?.delete(name)
        }
      }
    }
  }

  /**
   * Operates in previously registered nodes and edges in order to put
   * back in place any of the original edges that were referenced to in
   * active (ongoing) breadcrumb parsing entries that were never completed.
   *
   * This method can be used to easily rollback any pending operations
   * once the graph traversal is done.
   */
  rollbackActiveEntries(): void {
    for (const modifier of this.activeModifiers) {
      // if the modifier has an original edge, we can put it back in place
      if (modifier.originalEdge) {
        modifier.originalFrom.edgesOut.set(
          modifier.originalEdge.spec.name,
          modifier.originalEdge,
        )
      }
      // then we deregister the modifier
      this.deregisterModifier(modifier.modifier)
    }
  }

  /**
   * Convenience method to instantiate and load in one call.
   * Returns undefined if the project does not have a vlt.json file,
   * otherwise returns the loaded Modifiers instance.
   */
  static maybeLoad(options: GraphModifierOptions) {
    const config = load('modifiers', assertGraphModifiersConfig)
    if (!config) return
    return new GraphModifier(options)
  }

  /**
   * Convenience method to instantiate and load in one call.
   * Throws if called on a directory that does not have a vlt.json file.
   */
  static load(options: GraphModifierOptions) {
    return new GraphModifier(options)
  }
}
