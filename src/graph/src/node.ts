import type { PathBase, PathScurry } from 'path-scurry'
import {
  isPackageNameConfused,
  getId,
  hydrateTuple,
  splitDepID,
} from '@vltpkg/dep-id'
import type { DepID, DepIDTuple } from '@vltpkg/dep-id'
import { typeError } from '@vltpkg/error-cause'
import type { Spec, SpecOptions } from '@vltpkg/spec'
import {
  brotliTarballName,
  brotliTarballUrl,
  expandNormalizedManifestSymbols,
  tarballFormat,
} from '@vltpkg/types'
import type {
  Dist,
  Integrity,
  NormalizedManifest,
  DependencyTypeShort,
  GraphLike,
  NodeLike,
} from '@vltpkg/types'
import { Edge } from './edge.ts'
import type { Graph } from './graph.ts'
import { stringifyNode } from './stringify-node.ts'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { GraphModifier } from './modifiers.ts'

export type NodeOptions = SpecOptions & {
  projectRoot: string
  graph: GraphLike
  /**
   * Resolve to a version's Brotli (`.tar.br`) alternate when its manifest
   * advertises one. Defaults to true; false always resolves to the `.tgz`.
   */
  'brotli-tarballs'?: boolean
}

/**
 * The absolute URL of a version's Brotli (`.tar.br`) tarball. `dist`
 * arrives here with an absolute `tarball`, so the alternate's relative
 * reference resolves against it. See {@link brotliTarballUrl} for which
 * references this client accepts.
 */
const brotliAlternate = (dist?: Dist): string | undefined =>
  brotliTarballUrl(dist?.tarball, dist?.alternates)

export class Node implements NodeLike {
  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Node'
  }

  #options: NodeOptions
  #location?: string
  #resolvedLoc?: { loc: string; cwd: PathBase; path: string }
  #rawManifest?: NormalizedManifest

  #optional = false
  /**
   * True if a node is only reachable via optional or peerOptional edges from
   * any importer.
   *
   * Setting this to false, if previously set to true, will also unset
   * the flag on any optional-flagged non-optional dependencies.
   */
  get optional() {
    return this.#optional
  }
  set optional(optional: boolean) {
    const before = this.#optional
    this.#optional = optional
    if (before && !optional) {
      // unset for all deps, as well
      for (const { to, optional } of this.edgesOut.values()) {
        if (!optional && to?.optional) to.optional = false
      }
    }
  }

  isOptional(): this is Node & { optional: true } {
    return this.#optional
  }

  #dev = false
  /**
   * True if a node is only reachable via dev edges from any importer.
   *
   * Setting this to false, if previously set to true, will also unset
   * the flag on any dev-flagged non-dev dependencies.
   */
  get dev() {
    return this.#dev
  }
  set dev(dev: boolean) {
    const before = this.#dev
    this.#dev = dev
    if (before && !dev) {
      // unset for all deps, as well
      for (const { to, dev } of this.edgesOut.values()) {
        if (!dev && to?.dev) to.dev = false
      }
    }
  }

  isDev(): this is Node & { dev: true } {
    return this.#dev
  }

  /**
   * True if there's a manifest-confused package name.
   */
  confused = false

  /**
   * True if this node has been extracted to the file system.
   */
  extracted = false

  /**
   * List of edges coming into this node.
   */
  edgesIn = new Set<Edge>()

  /**
   * List of edges from this node into other nodes. This usually represents
   * that the connected node is a direct dependency of this node.
   */
  edgesOut = new Map<string, Edge>()

  /**
   * A `mainImporter` node may have workspace connected to it,
   * equivalent to its `edgesOut` linked deps.
   */
  workspaces: Map<string, Edge> | undefined

  /**
   * A reference to the {@link DepID} this node represents in the graph.
   */
  id: DepID

  /**
   * True if this node is an importer node.
   */
  importer = false

  /**
   * True if this node is the project root node.
   */
  mainImporter = false

  /**
   * A reference to the graph this node is a part of.
   */
  graph: Graph

  /**
   * The manifest integrity value.
   */
  integrity?: Integrity

  /**
   * True when `integrity` and `resolved` came from a lockfile, i.e. they were
   * verified by the install that wrote them.
   */
  resolvedFromLockfile = false

  /**
   * The manifest this node represents in the graph.
   */
  manifest?: NormalizedManifest

  /**
   * Whether this node's artifact is the `.tar.br`: from the manifest's
   * `dist.alternates` at construction, or overwritten by the lockfile's
   * flag bit when the node came from one (so an existing lockfile keeps
   * whichever artifact it pinned). Only consulted while `resolved` is
   * still unset -- once there is a URL, it is the answer (see the
   * getter).
   */
  #brotli = false

  /**
   * True when this node's artifact is the registry's Brotli (`.tar.br`)
   * tarball rather than the gzip `.tgz`, which makes `integrity` that
   * artifact's hash. `resolved` is authoritative whenever it is set, so
   * the two can never drift; the stored bit only carries the lockfile's
   * answer across to `setResolved()`, which has to know the extension
   * before it can build the URL.
   */
  get brotli(): boolean {
    return this.resolved ?
        tarballFormat(this.resolved) === 'brotli'
      : this.#brotli
  }

  set brotli(brotli: boolean) {
    this.#brotli = brotli
  }

  /**
   * Project where this node resides
   */
  projectRoot: string

  /**
   * For registry nodes, this is the registry we fetched them from.
   * Needed because their un-prefixed dependencies need to come from
   * the same registry, if it's not the default.
   */
  registry?: string

  /**
   * If this node has been modified as part of applying a {@link GraphModifier}
   * then this field will contain the modifier query that was applied.
   * Otherwise, it will be `undefined`.
   */
  modifier: string | undefined

  /**
   * The name of the package represented by this node, this is usually
   * equivalent to `manifest.name` but in a few ways it may differ such as
   * nodes loaded from a lockfile that lacks a loaded manifest.
   * This field should be used to retrieve package names instead.
   */
  #name?: string
  get name() {
    if (this.#name) return this.#name
    this.#name = this.id
    return this.#name
  }

  /**
   * The version of the package represented by this node, this is usually
   * equivalent to `manifest.version` but in a few ways it may differ such as
   * nodes loaded from a lockfile that lacks a loaded manifest.
   * This field should be used to retrieve package versions instead.
   */
  version?: string

  /**
   * An address {@link PackageInfoClient} may use to extract this package.
   */
  resolved?: string

  /**
   * Platform requirements (engines, os, cpu) extracted from manifest.
   * Stored separately for optional dependencies to enable platform checks
   * when manifest is not loaded.
   */
  platform?: {
    engines?: Record<string, string>
    os?: string[] | string
    cpu?: string[] | string
    libc?: string[] | string
  }

  /**
   * Record of binary names to their paths in the package, if any.
   */
  bins?: Record<string, string>

  /**
   * True if the package has a root binding.gyp, when known without a
   * disk check (placed from the global store). Not persisted.
   */
  bindingGyp?: boolean

  /**
   * True if this node has been built as part of the reify step.
   */
  built = false

  /**
   * Build state of this node - tracks whether it needs building, has been built, or failed.
   * - 'none': No build state (default)
   * - 'needed': Node needs to be built
   * - 'built': Node has been successfully built
   * - 'failed': Node build has failed
   */
  buildState: 'none' | 'needed' | 'built' | 'failed' = 'none'

  /**
   * Deterministic unique string used to identify (and ultimately duplicate)
   * nodes that are affected by a peer context set modified resolution.
   * These are appended to the node {@link DepID} as the `extra` suffix.
   */
  peerSetHash?: string

  /**
   * True if this node is detached from the graph.
   * This is used to indicate that the node is not part of the graph
   * although the node is still available as part of the resolution process.
   * Allows for skipping fetching manifests for detached nodes.
   */
  detached = false

  /**
   * The file system location for this node.
   */
  get location(): string {
    if (this.#location) {
      return this.#location
    }
    this.#location = `./node_modules/.vlt/${this.id}/node_modules/${this.name}`
    // if using the default location, it is in the store
    this.inVltStore = () => true
    return this.#location
  }

  set location(location: string) {
    this.#location = location
    // reset memoization, since it might be elsewhere now
    if (this.inVltStore !== Node.prototype.inVltStore) {
      this.inVltStore = Node.prototype.inVltStore
    }
  }

  /**
   * The resolved location of the node in the file system.
   * Memoized per location and scurry cwd.
   */
  resolvedLocation(scurry: PathScurry): string {
    const loc = this.location
    const { cwd } = scurry
    const m = this.#resolvedLoc
    if (m?.loc === loc && m.cwd === cwd) return m.path
    const path = cwd.resolve(loc).fullpath()
    this.#resolvedLoc = { loc, cwd, path }
    return path
  }

  /**
   * The location of the node_modules folder where this node's edgesOut
   * should be linked into. For nodes in the store, this is the parent
   * directory, since they're extracted into a node_modules folder
   * side by side with links to their deps. For nodes outside of the store
   * (ie, importers and arbitrary link deps) this is the node_modules folder
   * directly inside the node's directory.
   */
  nodeModules(scurry: PathScurry): string {
    const loc = this.resolvedLocation(scurry)
    if (this.inVltStore()) {
      return loc.substring(0, loc.length - this.name.length - 1)
    }
    const { sep } = scurry.cwd
    return (loc.endsWith(sep) ? loc : loc + sep) + 'node_modules'
  }

  constructor(
    options: NodeOptions,
    id?: DepID,
    manifest?: NormalizedManifest,
    spec?: Spec,
    name?: string,
    version?: string,
  ) {
    this.#options = options
    this.projectRoot = options.projectRoot
    if (id) {
      this.id = id
    } else {
      if (!manifest || !spec) {
        throw typeError(
          'A new Node needs either a manifest & spec or an id parameter',
          {
            manifest,
          },
        )
      }
      this.id = getId(spec, manifest)
    }
    this.graph = options.graph as Graph
    this.manifest = manifest
    // Settled here, not in setResolved(), because `integrity` is filled
    // in from `dist.integrity` between the two -- and that hash is the
    // `.tgz`'s. A node whose artifact is the `.tar.br` has to be able to
    // turn that down before it arrives.
    this.#brotli =
      options['brotli-tarballs'] !== false &&
      !!brotliAlternate(manifest?.dist)

    this.#name = name || this.manifest?.name
    this.version = version || this.manifest?.version
  }

  /**
   * return true if this node is located in the vlt store
   * memoized the first time it's called, since the store location
   * doesn't change within the context of a single operation.
   */
  inVltStore(): boolean {
    // technically this just means it's in *a* vlt store, but we can safely
    // assume that a user won't construct a path like this by accident,
    // and there's only ever one store in any given project.
    const inStore = this.location.endsWith(
      `.vlt/${this.id}/node_modules/${this.name}`,
    )
    this.inVltStore = () => inStore
    return inStore
  }

  #registryNodeResolved(tuple: DepIDTuple) {
    const spec = hydrateTuple(tuple, this.#name, this.#options)
    const dist = this.manifest?.dist
    const tarball = dist?.tarball || spec.conventionalRegistryTarball
    const brotli =
      this.#brotli ?
        // the manifest's own reference when there is one, and otherwise
        // the registry's naming for it: same stem as the `.tgz`, a
        // different extension. That convention is what lets a lockfile
        // node -- which has no manifest -- spend one flag bit rather
        // than a second URL.
        (brotliAlternate(dist) ??
        (tarball && brotliTarballName(tarball)))
      : undefined
    if (brotli) {
      this.resolved = brotli
      // `dist.integrity` describes the `.tgz`. The `.tar.br` is a
      // different artifact with a different hash, pinned by its own
      // `Repr-Digest` on the install that first fetches it.
      return
    }
    this.resolved = tarball
    this.integrity ??= dist?.integrity
  }

  get options() {
    return this.#options
  }

  /* c8 ignore next */
  set options(_opts: SpecOptions) {}

  equals(other: Node) {
    return this.id === other.id && this.location === other.location
  }

  /**
   * Sets the node as an importer along with its location.
   */
  setImporterLocation(location: string) {
    this.#location = location
    this.importer = true
  }

  /**
   * Sets the appropriate resolve / integrity value for this node.
   * Note that other places might also set these values, like for
   * example the lockfile that might have already have this info.
   */
  setResolved() {
    // file | remote | workspace type of ids all points to a URI that
    // can be used as the `resolved` value, so we split the dep id
    // for these cases.
    const tuple = splitDepID(this.id)
    const [type, resolved] = tuple
    switch (type) {
      case 'remote': {
        this.resolved = resolved
        this.integrity ??= this.manifest?.dist?.integrity
        break
      }
      case 'registry':
        this.#registryNodeResolved(tuple)
        break
      default:
        this.resolved = resolved
        break
    }
  }

  /**
   * Update this node's DepID and peer suffix after canonicalization.
   * Resets name/location memos that were derived from the previous id.
   */
  setPeerIdentity(id: DepID, peerSetHash: string) {
    const prevId = this.id
    const prevName = this.name
    const nameWasId = this.#name === prevId
    const prevDefault = `./node_modules/.vlt/${prevId}/node_modules/${prevName}`
    const locWasDefault =
      !this.#location || this.#location === prevDefault

    this.id = id
    this.peerSetHash = peerSetHash
    if (nameWasId) this.#name = undefined
    const nextName = this.name
    if (prevName !== nextName) {
      const oldSet = this.graph.nodesByName.get(prevName)
      oldSet?.delete(this)
      if (oldSet?.size === 0) {
        this.graph.nodesByName.delete(prevName)
      }
      const nbn = this.graph.nodesByName.get(nextName) ?? new Set()
      nbn.add(this)
      this.graph.nodesByName.set(nextName, nbn)
    }
    if (locWasDefault) {
      this.location = `./node_modules/.vlt/${id}/node_modules/${nextName}`
    }
  }

  setDefaultLocation() {
    const def = `./node_modules/.vlt/${this.id}/node_modules/${this.name}`

    // only relocate if the location is in node_modules already
    if (
      !this.importer &&
      (!this.#location ||
        (this.#location !== def &&
          /^(?:\.\/)?node_modules\//.test(this.#location)))
    ) {
      this.#location = def
    }
  }

  /**
   * Add an edge from this node connecting it to a direct dependency.
   */
  addEdgesTo(type: DependencyTypeShort, spec: Spec, node?: Node) {
    const edge = new Edge(type, spec, this, node)
    node?.edgesIn.add(edge)
    this.edgesOut.set(spec.name, edge)
    return edge
  }

  /**
   * The raw manifest before any modifications.
   * If not set, falls back to the current manifest.
   */
  get rawManifest(): NormalizedManifest | undefined {
    return this.#rawManifest ?? this.manifest
  }

  /**
   * Sets this node as having a manifest-confused manifest.
   */
  setConfusedManifest(
    fixed: NormalizedManifest,
    confused?: NormalizedManifest,
  ) {
    this.manifest = fixed
    this.#rawManifest = confused
    this.confused = true
    this.#name = this.manifest.name
  }

  /**
   * Sets this node as having a manifest-confused manifest.
   */
  maybeSetConfusedManifest(
    spec: Spec,
    confused?: NormalizedManifest,
  ) {
    if (isPackageNameConfused(spec, this.manifest?.name)) {
      this.setConfusedManifest(
        {
          ...this.manifest,
          name: spec.name,
        },
        confused,
      )
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      location: this.location,
      importer: this.importer,
      manifest:
        this.manifest &&
        expandNormalizedManifestSymbols(this.manifest),
      projectRoot: this.projectRoot,
      integrity: this.integrity,
      resolved: this.resolved,
      dev: this.dev,
      optional: this.optional,
      confused: this.confused,
      modifier: this.modifier,
      platform: this.platform,
      buildState: this.buildState,
      ...(this.peerSetHash ?
        { peerSetHash: this.peerSetHash }
      : undefined),
      ...(this.confused ?
        { rawManifest: this.#rawManifest }
      : undefined),
    }
  }

  toString() {
    return stringifyNode(this)
  }
}

/**
 * Copy the tarball metadata `to` is missing from another node for the
 * same package version. Lockfile provenance only carries over once both
 * `integrity` and `resolved` are set, since that pair is what makes it
 * usable without refetching.
 */
export const copyPackageMetadata = (to: Node, from: Node) => {
  to.integrity ??= from.integrity
  to.resolved ??= from.resolved
  if (from.resolvedFromLockfile && to.integrity && to.resolved) {
    to.resolvedFromLockfile = true
  }
}

export const isNode = (value: unknown): value is Node => {
  return (
    typeof value === 'object' &&
    value != null &&
    'id' in value &&
    'manifest' in value &&
    (value as Node)[Symbol.toStringTag] === '@vltpkg/graph.Node'
  )
}

export const asNode = (value: unknown): Node => {
  if (!isNode(value)) {
    throw typeError('Expected a node', { found: value })
  }
  return value
}
