import { DepID, joinDepIDTuple } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
import { Manifest } from '@vltpkg/types'
import { readFileSync, statSync } from 'fs'
import { GlobOptionsWithFileTypesFalse, globSync } from 'glob'
import { DepResults, graphRun, graphRunSync } from 'graph-run'
import { basename, resolve } from 'path'
import { Path, PathScurry } from 'path-scurry'
import { parse } from 'polite-json'

/**
 * The object passed to the constructor or {@link Monorepo#load} to limit which
 * {@link Workspace Workspaces} get loaded.
 */
export type LoadQuery = {
  /**
   * A glob pattern string, or an array of them. Only workspaces found
   * in paths matched will be loaded.
   */
  paths?: string | string[]
  /**
   * A string, or an array of strings. If set, only workspaces in the
   * specified groups named will be included, if set.
   */
  groups?: string | string[]
}

/**
 * Canonical form of the {@link WorkspaceConfig}, used
 * internally for consistency.
 */
export type WorkspaceConfigObject = {
  [group: string]: string[]
}

/**
 * Allowed datatype in the `vlt-workspaces.json` file.
 */
export type WorkspaceConfig =
  | string
  | string[]
  | WorkspaceConfigObject

/**
 * Turn a {@link WorkspaceConfig} into a
 * {@link WorkspaceConfigObject}, or throw if it's not valid.
 */
export const asWSConfig = (
  conf: unknown,
  path?: string,
): WorkspaceConfigObject => {
  assertWSConfig(conf, path)
  return (
    typeof conf === 'string' ? { packages: [conf] }
    : Array.isArray(conf) ? { packages: conf }
    : conf
  )
}

/**
 * Throw if the provided value is not a valid {@link WorkspaceConfig}
 */
export const assertWSConfig: (
  conf: unknown,
  path?: string,
) => asserts conf is WorkspaceConfig = (
  conf: unknown,
  path?: string,
) => {
  if (typeof conf === 'string') return conf

  if (Array.isArray(conf)) {
    for (const c of conf) {
      if (typeof c !== 'string') {
        throw error('Invalid workspace definition', {
          path,
          found: c,
          wanted: 'string',
        })
      }
    }
    return
  }

  if (conf && typeof conf === 'object') {
    for (const [group, value] of Object.entries(conf)) {
      if (typeof value === 'string') continue
      if (Array.isArray(value)) {
        for (const c of value) {
          if (typeof c !== 'string') {
            throw error('Invalid workspace definition', {
              path,
              name: group,
              found: c,
              wanted: 'string',
            })
          }
        }
        continue
      }
      throw error('Invalid workspace definition', {
        path,
        name: group,
        found: value,
        wanted: 'string | string[]',
      })
    }
    return
  }

  throw error('Invalid workspace definition', {
    path,
    found: conf,
    wanted:
      'string | string[] | { [group: string]: string | string[] }',
  })
}

export interface MonorepoOptions {
  /**
   * A {@link PackageJson} object, for sharing manifest caches
   */
  packageJson?: PackageJson
  /**
   * A {@link PathScurry} object, for use in globs
   */
  scurry?: PathScurry
  /** Parsed normalized contents of a `vlt-workspaces.json` file */
  config?: WorkspaceConfigObject
  /**
   * If set, then {@link Monorepo#load} will be called immediately with
   * this argument.
   */
  load?: LoadQuery
}

/**
 * Class representing a Monorepo containing multiple workspaces.
 *
 * Does not automatically look up the root, but that can be provided by
 * running `Config.load()`, since it stops seeking the route when a
 * `vlt-workspaces.json` file is encountered.
 */
export class Monorepo {
  /** The project root where vlt-workspaces.json is found */
  projectRoot: string
  /** Scurry object to cache all filesystem calls (mostly globs) */
  scurry: PathScurry

  // maps both name and path to the workspace objects
  #workspaces = new Map<string, Workspace>()
  #groups = new Map<string, Set<Workspace>>()
  #config?: WorkspaceConfigObject
  packageJson: PackageJson

  /**
   * Number of {@link Workspace} objects loaded in this Monorepo
   */
  get size(): number {
    return [...this.#workspaces.values()].length
  }

  constructor(projectRoot: string, options: MonorepoOptions = {}) {
    this.projectRoot = resolve(projectRoot)
    this.scurry = options.scurry ?? new PathScurry(projectRoot)
    this.packageJson = options.packageJson ?? new PackageJson()
    if (options.load) this.load(options.load)
  }

  /**
   * Load the workspace definitions from vlt-workspaces.json,
   * canonicalizing the result into the effective `{[group:string]:string[]}`
   * form.
   *
   * Eg:
   * - `"src/*"` => `{packages:["src/*"]}`
   * - `{"apps": "src/*"}` => `{apps: ["src/*"]}`
   */
  get config(): WorkspaceConfigObject {
    if (this.#config) return this.#config
    const file = resolve(this.projectRoot, 'vlt-workspaces.json')
    let confData: string
    try {
      confData = readFileSync(file, 'utf8')
    } catch (er) {
      throw error('Not in a monorepo, no vlt-workspaces.json found', {
        path: this.projectRoot,
        cause: er as Error,
      })
    }
    let parsed: unknown
    try {
      parsed = parse(confData)
    } catch (er) {
      throw error('Invalid vlt-workspaces.json file', {
        path: this.projectRoot,
        cause: er as Error,
      })
    }
    this.#config = asWSConfig(parsed, file)
    return this.#config
  }

  /**
   * Iterating the Monorepo object yields the workspace objects, in as close to
   * topological dependency order as possible.
   */
  *[Symbol.iterator](): Generator<Workspace, void, void> {
    const [ws] = [...this.#workspaces.values()]
    if (!ws) return
    // leverage the fact that graphRun returns results in
    // as close to topological order as possible.
    for (const workspace of this.runSync(() => {}).keys()) {
      yield workspace
    }
  }

  /**
   * Iterating the Monorepo object yields the workspace objects, in as close to
   * topological dependency order as possible.
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<
    Workspace,
    void,
    void
  > {
    const [ws] = [...this.#workspaces.values()]
    if (!ws) return
    for (const workspace of (await this.run(() => {})).keys()) {
      yield workspace
    }
  }

  /**
   * By default, loads all workspaces reachable in the Monorepo.
   *
   * If provided with one (`string`)or more (`string[]`) group names in
   * the {@link LoadQuery#groups} field, then only Workspaces in the named
   * group(s) will be considered. Note that group names are unique string
   * matches, not globs.
   *
   * If provided with a set of arbitrary path arguments, then only paths
   * patching the provided pattern(s) will be included.
   *
   * These two options intersect, so
   * `load({groups:'foo', paths:'./foo/[xy]*'})` will only load the workspaces
   * in the group `foo` that match the paths glob.
   */
  load(query: LoadQuery = {}): this {
    const paths = new Set(
      typeof query.paths === 'string' ?
        [query.paths]
      : query.paths ?? [],
    )
    const groups = new Set(
      typeof query.groups === 'string' ?
        [query.groups]
      : query.groups ?? [],
    )

    const groupsExpanded: { [k: string]: Set<string> } = {}
    for (const [group, pattern] of Object.entries(this.config)) {
      if (groups.size && !groups.has(group)) continue
      groupsExpanded[group] = this.#glob(pattern)
    }
    const filter = paths.size ? this.#glob([...paths]) : paths

    // if we specified paths, but none matched, nothing to do
    if (paths.size && !filter.size) return this
    for (const [group, matches] of Object.entries(groupsExpanded)) {
      for (const path of matches) {
        if (filter.size && !filter.has(path)) continue
        this.#loadWS(path, group)
      }
    }

    return this
  }

  // Either load a workspace from disk, or from our internal set,
  // and assign it to the named group
  #loadWS(path: string, group?: string): Workspace {
    const loaded = this.#workspaces.get(path)
    if (loaded) return loaded
    const fullpath = resolve(this.projectRoot, path)
    const manifest = this.packageJson.read(fullpath)
    const ws = new Workspace(path, manifest, fullpath)
    if (group) ws.groups.push(group)
    this.#workspaces.set(ws.path, ws)
    this.#workspaces.set(ws.fullpath, ws)
    this.#workspaces.set(ws.name, ws)
    for (const name of ws.groups) {
      const group = this.#groups.get(name) ?? new Set()
      group.add(ws)
      this.#groups.set(name, group)
    }
    return ws
  }

  // can't be cached, because it's dependent on the matches set
  // but still worthwhile to have it defined in one place
  #globOptions(matches: Set<string>): GlobOptionsWithFileTypesFalse {
    // if the entry or any of its parent dirs are already matched,
    // then we should not explore further down that directory tree.
    // if we hit the projectRoot then stop searching.
    const inMatches = (p?: Path): boolean => {
      return (
        !!p?.relativePosix() &&
        (matches.has(p.relativePosix()) || inMatches(p.parent))
      )
    }

    return {
      root: this.projectRoot,
      cwd: this.projectRoot,
      posix: true,
      scurry: this.scurry,
      withFileTypes: false,
      ignore: {
        childrenIgnored: p =>
          basename(p.relativePosix()) === 'node_modules' ||
          inMatches(p),
        // ignore if fails to load package.json
        ignored: p => {
          p.lstatSync()
          const rel = p.relativePosix()
          if (!rel) return true
          const maybeDelete: string[] = []
          for (const m of matches) {
            if (rel.startsWith(m + '/')) return true
            if (m.startsWith(rel + '/')) {
              maybeDelete.push(m)
            }
          }
          if (!p.isDirectory()) return true
          const pj = p.resolve('package.json').lstatSync()
          if (!pj?.isFile()) return true
          try {
            this.packageJson.read(p.fullpath())
          } catch (er) {
            return true
          }
          for (const m of maybeDelete) {
            matches.delete(m)
          }
          matches.add(rel)
          return false
        },
      },
    }
  }

  #glob(pattern: string | string[]) {
    const matches = new Set<string>()
    globSync(pattern, this.#globOptions(matches))
    return matches
  }

  /**
   * Return the array of workspace dependencies that are found in
   * the loaded set, for use in calculating dependency graph order for
   * build operations.
   *
   * This does *not* get the full set of dependencies, or expand any
   * `workspace:` dependencies that are not loaded.
   *
   * Call with the `forceLoad` param set to `true` to attempt a full
   * load if any deps are not currently loaded.
   */
  getDeps(ws: Workspace, forceLoad = false): Workspace[] {
    // load manifest and find workspace: deps
    // filter by those loaded
    const { manifest } = ws
    const depWorkspaces: Workspace[] = []
    let didForceLoad = false
    for (const depType of [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'peerDependencies',
    ]) {
      const deps = manifest[depType]
      if (!deps) continue
      for (const [dep, spec] of Object.entries(deps)) {
        if (spec.startsWith('workspace:')) {
          let depWS = this.#workspaces.get(dep)
          if (!depWS) {
            if (!forceLoad) continue
            if (didForceLoad) continue
            didForceLoad = true
            this.load()
            depWS = this.#workspaces.get(dep)
            if (!depWS) continue
          }
          depWorkspaces.push(depWS)
        }
      }
    }
    return depWorkspaces
  }

  /** @todo */
  onCycle(
    _ws: Workspace,
    _cycle: Workspace[],
    _depPath: Workspace[],
  ) {
    // XXX - process logging? Need to say something like:
    // Cyclical workspace dependency warning!
    // When evaluating dependency ${ws.name} via ${
    //   path.map(ws => ws.name).join(' -> ')
    // }, a dependency cycle was detected: ${
    //   cycle.map(ws => ws.name).join(' -> ')
    // }. Operation will continue, but dependency order not guaranteed.`
  }

  /**
   * Return the set of workspaces in the named group.
   * If the group is not one we know about, then undefined is returned.
   */
  group(group: string) {
    return this.#groups.get(group)
  }

  /**
   * Get a loaded workspace by path or name.
   *
   * Note that this can only return workspaces that were ingested via a
   * previous call to {@link Monorepo#load}.
   */
  get(nameOrPath: string) {
    return this.#workspaces.get(nameOrPath)
  }

  /**
   * get the list of all loaded workspace names
   */
  *names() {
    for (const [key, ws] of this.#workspaces) {
      if (key === ws.name) yield key
    }
  }

  /**
   * get the list of all loaded workspace names
   */
  *paths() {
    for (const [key, ws] of this.#workspaces) {
      if (key === ws.path) yield key
    }
  }

  /**
   * get the workspace objects in no particular order.
   * this is ever so slightly faster than iterating, because it doesn't
   * explore the graph to yield results in topological dependency order,
   * and should be used instead when order doesn't matter.
   */
  values() {
    return this.#workspaces.values()
  }

  /**
   * Get all the keys (package names and paths) for loaded workspaces.
   * Union of {@link Monorepo#names} and {@link Monorepo#paths}
   */
  *keys() {
    for (const ws of this.#workspaces.values()) {
      yield ws.path
      if (ws.name !== ws.path) yield ws.name
    }
  }

  /**
   * Run an operation asynchronously over all loaded workspaces
   *
   * If the `forceLoad` param is true, then it will attempt to do a full load
   * when encountering a `workspace:` dependency that isn't loaded.
   *
   * Note that because the return type appears in the parameters of the
   * operation function, it must be set explicitly either in the operation
   * function signature or by calling `run<MyType>` or it'll fall back to
   * `unknown`, similar to `Array.reduce()`, and for the same reason.
   */
  async run<R>(
    operation: (
      s: Workspace,
      signal: AbortSignal,
      depResults: DepResults<Workspace, R>,
    ) => Promise<R> | R,
    forceLoad = false,
  ) {
    const [ws, ...rest] = [...this.#workspaces.values()]
    if (!ws) {
      throw error('No workspaces loaded', undefined, this.run)
    }

    return graphRun<Workspace, R>({
      graph: [ws, ...rest],
      getDeps: ws => this.getDeps(ws, forceLoad),
      visit: async (ws, signal, _, depResults) =>
        await operation(ws, signal, depResults),
      onCycle: (ws, cycle, path) => this.onCycle(ws, cycle, path),
    })
  }

  /**
   * Run an operation synchronously over all loaded workspaces
   *
   * If the `forceLoad` param is true, then it will attempt to do a full load
   * when encountering a `workspace:` dependency that isn't loaded.
   *
   * Note that because the return type appears in the parameters of the
   * operation function, it must be set explicitly either in the operation
   * function signature or by calling `runSync<MyType>` or it'll fall back to
   * `unknown`, similar to `Array.reduce()`, and for the same reason.
   */
  runSync<R>(
    operation: (
      s: Workspace,
      signal: AbortSignal,
      depResults: DepResults<Workspace, R>,
    ) => R,
    forceLoad = false,
  ) {
    const [ws, ...rest] = [...this.#workspaces.values()]
    if (!ws) {
      throw error('No workspaces loaded', undefined, this.run)
    }

    return graphRunSync<Workspace, R>({
      graph: [ws, ...rest],
      getDeps: ws => this.getDeps(ws, forceLoad),
      visit: (ws, signal, _, depResults) =>
        operation(ws, signal, depResults),
      onCycle: (ws, cycle, path) => this.onCycle(ws, cycle, path),
    })
  }

  /**
   * Convenience method to instantiate and load in one call.
   * Returns undefined if the project is not a monorepo workspaces
   * root, otherwise returns the loaded Monorepo.
   */
  static maybeLoad(
    projectRoot: string,
    options: MonorepoOptions = { load: {} },
  ) {
    try {
      if (
        !statSync(
          resolve(projectRoot, 'vlt-workspaces.json'),
        ).isFile()
      ) {
        return
      }
    } catch {
      return
    }
    const { load = {} } = options
    return new Monorepo(projectRoot, { ...options, load })
  }

  /**
   * Convenience method to instantiate and load in one call.
   * Throws if called on a directory that is not a workspaces root.
   */
  static load(
    projectRoot: string,
    options: MonorepoOptions = { load: {} },
  ) {
    const { load = {} } = options
    return new Monorepo(projectRoot, { ...options, load })
  }
}

/**
 * Class representing a single Workspace in a {@link Monorepo}
 */
export class Workspace {
  id: DepID
  path: string
  fullpath: string
  manifest: Manifest
  groups: string[] = []
  name: string

  constructor(path: string, manifest: Manifest, fullpath: string) {
    this.id = joinDepIDTuple(['workspace', path])
    this.path = path
    this.fullpath = fullpath
    this.manifest = manifest
    this.name = manifest.name ?? path
  }
}
