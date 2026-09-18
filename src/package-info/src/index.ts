import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import { error } from '@vltpkg/error-cause'
import { clone, resolve as gitResolve, revs } from '@vltpkg/git'
import { logRequest } from '@vltpkg/output'
import { PackageJson } from '@vltpkg/package-json'
import type { PickManifestOptions } from '@vltpkg/pick-manifest'
import { pickManifest } from '@vltpkg/pick-manifest'
import type {
  RegistryClient,
  RegistryClientOptions,
  RegistryClientRequestOptions,
} from '@vltpkg/registry-client'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import type { Pool } from '@vltpkg/tar'
import type { Integrity, Manifest, Packument } from '@vltpkg/types'
import { asPackument } from '@vltpkg/types'
import ssri from 'ssri'
import { Monorepo } from '@vltpkg/workspaces'
import { XDG } from '@vltpkg/xdg'
import { createHash, randomBytes } from 'node:crypto'
import {
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import {
  basename,
  dirname,
  resolve as pathResolve,
  relative,
} from 'node:path'
import { debuglog } from 'node:util'
import { create as tarC } from 'tar'
import { rename } from './rename.ts'

const debug = debuglog('vlt')

const xdg = new XDG('vlt')
export const delimiter = '~'

/**
 * Accept header for packument requests. Prefers vlt's abbreviated
 * packument and falls back to the full one on registries that do not
 * know the type. See `PackageInfoClient.#fetchPackument`.
 */
export const PACKUMENT_ACCEPT =
  'application/vnd.vlt.packument-v1+json; q=1.0, application/json; q=0.8, */*'

/**
 * True when resolving `spec` can never select a prerelease, so the
 * `?stable` packument is enough. A non-default tag, or a range with a
 * prerelease in one of its comparators, admits prereleases; so does
 * `*`, but it only picks one when no stable version exists, which
 * {@link PackageInfoClient.manifest} covers by retrying with the full
 * packument.
 */
const stableSuffices = (
  spec: Spec,
  { tag }: PickManifestOptions,
): boolean => {
  if (tag && tag !== 'latest') return false
  const { distTag, range } = spec.final
  if (distTag) return distTag === 'latest'
  /* c8 ignore next 2 - a registry spec always has a tag or a range, and
   * Spec never parses one with includePrerelease */
  if (!range || range.includePrerelease) return false
  return !range.set.some(c => c.tuples.some(admitsPrerelease))
}

// `^1` desugars to `>=1.0.0 <2.0.0-0`: the `-0` upper bound is the lowest
// prerelease, there to exclude the 2.0.0 prereleases, not admit them.
type RangeTuple = NonNullable<
  Spec['range']
>['set'][number]['tuples'][number]
const admitsPrerelease = (t: RangeTuple): boolean => {
  if (!Array.isArray(t)) return false
  const [op, { prerelease }] = t
  if (!prerelease?.length) return false
  return !(
    op === '<' &&
    prerelease.length === 1 &&
    prerelease[0] === 0
  )
}

export type Resolution = {
  resolved: string
  integrity?: Integrity
  signatures?: Exclude<Manifest['dist'], undefined>['signatures']
  spec: Spec
}

export type PackageInfoClientOptions = RegistryClientOptions &
  SpecOptions & {
    /** root of the project. Defaults to process.cwd() */
    projectRoot?: string
    /** PackageJson object */
    packageJson?: PackageJson

    monorepo?: Monorepo

    /** workspace groups to load, irrelevant if Monorepo provided */
    'workspace-group'?: string[]

    /** workspace paths to load, irrelevant if Monorepo provided */
    workspace?: string[]
  }

export type PackageInfoClientRequestOptions = PickManifestOptions &
  RegistryClientRequestOptions & {
    /** dir to resolve `file://` specifiers against. Defaults to projectRoot. */
    from?: string
    /**
     * Only versions without a prerelease are needed. A registry that
     * supports it serves a smaller `?stable` packument with prereleases
     * (and the dist-tags pointing at them) removed; others ignore it.
     */
    stable?: boolean
  }

export type PackageInfoClientExtractOptions =
  PackageInfoClientRequestOptions & {
    integrity?: Integrity
    resolved?: string
    /**
     * When true, indicates that integrity + resolved came from a
     * lockfile (i.e. they were already verified on first install).
     * Skips the client-side tarball integrity check.
     * Defaults to false — fresh installs always verify integrity.
     */
    fromLockfile?: boolean
  }

// the maximum duration of a manifest cache file
const manifestCacheMaxAge = 5 * 60 * 1000

/**
 * There is no default registry. Anything that needs to build a registry
 * URL fails with a `ECONFIG` error when none has been configured.
 */
const noRegistryError = (spec: Spec) =>
  error(
    'No registry configured to resolve this spec. Set "registry" in ' +
      'vlt.json, pass --registry, or run `vlt login --registry=<url>`. ' +
      'See https://docs.vlt.sh/cli',
    { code: 'ECONFIG', spec },
  )

/**
 * A selector that can point at a different version tomorrow: a dist tag,
 * or a range matching anything (`*`, empty string). Manifest results for
 * these are not cached to disk, and packument requests for them force a
 * revalidation of the registry client's cache entry.
 *
 * Takes a *final* spec (`spec.final`), same as `pickManifest` sees.
 */
const isMovingSelector = (f: Spec) => !!(f.distTag || f.range?.isAny)

export class PackageInfoClient {
  #registryClient?: RegistryClient
  #projectRoot: string
  #tarPool?: Pool
  options: PackageInfoClientOptions
  #resolutions = new Map<string, Resolution>()
  packageJson: PackageJson
  monorepo?: Monorepo
  #trustedIntegrities = new Map<string, Integrity>()
  #manifestCacheMinAge = Date.now() - manifestCacheMaxAge
  #cachePath: string
  // In-flight coalescing key is the packument URL, `?stable` included,
  // like the disk cache; every caller requests the same representation
  // (see #fetchPackument). The one thing that does vary per caller is
  // forceRevalidate, so record it and let a moving selector reuse a
  // forced promise but never a non-forced one (see packument()).
  #packumentPromises = new Map<
    string,
    { promise: Promise<Packument>; forced: boolean }
  >()
  // unique temp file names for atomic manifest cache writes
  #manifestWriteRandom = randomBytes(6).toString('hex')
  #manifestWriteCount = 0
  // cache paths already written this run. manifest() is called many
  // times for the same cache key per install and content for a given
  // path is deterministic within a run, so only the first write is
  // needed. entries are removed when the on-disk file is invalidated
  // so the refreshed manifest can be written again.
  #manifestWritePaths = new Set<string>()

  #registryClientPromise?: Promise<RegistryClient>
  #tarPoolPromise?: Promise<Pool>

  async getRegistryClient() {
    if (this.#registryClient) return this.#registryClient
    this.#registryClientPromise ??=
      import('@vltpkg/registry-client').then(({ RegistryClient }) => {
        this.#registryClient = new RegistryClient(this.options)
        return this.#registryClient
      })
    return this.#registryClientPromise
  }

  async getTarPool() {
    if (this.#tarPool) return this.#tarPool
    this.#tarPoolPromise ??= import('@vltpkg/tar').then(
      ({ Pool }) => {
        this.#tarPool = new Pool()
        return this.#tarPool
      },
    )
    return this.#tarPoolPromise
  }

  constructor(options: PackageInfoClientOptions = {}) {
    this.options = options
    this.#projectRoot = options.projectRoot || process.cwd()
    this.packageJson = options.packageJson ?? new PackageJson()
    const wsLoad = {
      ...(options.workspace?.length && { paths: options.workspace }),
      ...(options['workspace-group']?.length && {
        groups: options['workspace-group'],
      }),
    }
    this.monorepo =
      options.monorepo ??
      Monorepo.maybeLoad(this.#projectRoot, {
        load: wsLoad,
        packageJson: this.packageJson,
      })
    this.#cachePath = options.cache ?? xdg.cache()
    // optionally create its cache directory if it doesn't exist
    void mkdir(pathResolve(this.#cachePath, 'package-info'), {
      recursive: true,
    }).catch(() => {})
  }

  async extract(
    spec: Spec | string,
    target: string,
    options: PackageInfoClientExtractOptions = {},
  ): Promise<Resolution> {
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const {
      from = this.#projectRoot,
      integrity,
      resolved,
      fromLockfile = false,
    } = options
    const f = spec.final
    // If the caller already provides both integrity and resolved
    // (from lockfile or prior resolution), skip re-resolving.
    const alreadyResolved = !!(integrity && resolved)
    const r =
      alreadyResolved ?
        { resolved, integrity, spec }
      : await this.resolve(spec, options)

    switch (f.type) {
      case 'git': {
        const {
          gitRemote,
          gitCommittish,
          remoteURL,
          gitSelectorParsed,
        } = f
        if (!remoteURL) {
          /* c8 ignore start - Impossible, would throw on the resolve */
          if (!gitRemote)
            throw this.#resolveError(
              spec,
              options,
              'no remote on git: specifier',
            )
          /* c8 ignore stop */
          const { path } = gitSelectorParsed ?? {}
          if (path !== undefined) {
            // use obvious name because it's in node_modules
            const tmp = pathResolve(
              dirname(target),
              `.TEMP.${basename(target)}-${randomBytes(6).toString('hex')}`,
            )
            await clone(gitRemote, gitCommittish, tmp, { spec })
            const src = pathResolve(tmp, path)
            await rename(src, target)
            // intentionally not awaited
            void rm(tmp, { recursive: true, force: true })
          } else {
            await clone(gitRemote, gitCommittish, target, { spec })
            // intentionally not awaited
            void rm(target + '/.git', { recursive: true })
          }
          return r
        }
        // fallthrough if a remote tarball url present
      }

      case 'registry': {
        // if the tarball is already on disk, unpack it straight from
        // the cache file: it never has to be held in the client's
        // in-memory cache. anything unexpected falls through to the
        // fetch path, which throws its own error if the body is
        // genuinely bad.
        const cached = (await this.getRegistryClient()).cachedBody(
          r.resolved,
          { integrity: r.integrity },
        )
        if (cached) {
          try {
            await (
              await this.getTarPool()
            ).unpack(cached.body, target)
            logRequest(r.resolved, 'cache')
            return r
          } catch (er) {
            // a systematically failing fast path (every entry still
            // gzipped, EACCES, ENOSPC...) doubles the IO of the fetch
            // path, so leave a trace behind. NODE_DEBUG=vlt to see it.
            debug(
              'cached tarball unpack failed: %s: %s',
              cached.path,
              er,
            )
          }
        }

        const fetchTarball = async (useCache?: false) => {
          const trustIntegrity =
            this.#trustedIntegrities.get(r.resolved) === r.integrity

          const response = await (
            await this.getRegistryClient()
          ).request(r.resolved, {
            integrity: r.integrity,
            trustIntegrity,
            ...(useCache === false ? { useCache } : {}),
          })

          if (response.statusCode !== 200) {
            throw this.#resolveError(
              spec,
              options,
              `Registry returned HTTP ${response.statusCode} when ` +
                `fetching the tarball for ${spec}. The resolved version ` +
                `may have been unpublished, or the registry may be ` +
                `misconfigured or unreachable.`,
              {
                url: r.resolved,
                response,
              },
            )
          }

          // if it's not trusted already, but valid, start trusting
          if (
            !trustIntegrity &&
            response.checkIntegrity({ spec, url: resolved })
          ) {
            this.#trustedIntegrities.set(
              r.resolved,
              response.integrity,
            )
          }

          const buf = response.buffer()

          // Verify network-delivered tarball bytes against dist.integrity.
          // Skip cache-served bodies: they were verified on the fetch that
          // populated the cache, and cache-unzip rewrites them un-gzipped
          // so the gzip-hash can never match. Skip lockfile-sourced
          // integrity: it was verified on first install.
          if (r.integrity && !fromLockfile && !response.fromCache) {
            const hash = createHash('sha512')
            hash.update(buf)
            const computed: Integrity = `sha512-${hash.digest('base64')}`
            /* c8 ignore start - defense-in-depth: registry client's
             * checkIntegrity() usually catches mismatches first. */
            if (computed !== r.integrity) {
              throw error('Tarball integrity check failed', {
                code: 'EINTEGRITY',
                spec,
                url: r.resolved,
                wanted: r.integrity,
                found: computed,
              })
            }
            /* c8 ignore stop */
          }

          return buf
        }

        let buf: Buffer
        try {
          buf = await fetchTarball()
        } catch (er) {
          // On EINTEGRITY, retry once bypassing cache. This handles
          // transient issues such as corrupted downloads or CDN
          // inconsistencies that cause the cached tarball to not
          // match the expected integrity hash.
          if (
            er instanceof Error &&
            'cause' in er &&
            (er.cause as Record<string, unknown> | undefined)
              ?.code === 'EINTEGRITY'
          ) {
            buf = await fetchTarball(false)
          } else {
            throw er
          }
        }

        try {
          await (await this.getTarPool()).unpack(buf, target)
        } catch (er) {
          throw this.#resolveError(
            spec,
            options,
            'tar unpack failed',
            { cause: er },
          )
        }
        return r
      }

      case 'remote': {
        const response = await (
          await this.getRegistryClient()
        ).request(r.resolved)
        if (response.statusCode !== 200) {
          throw this.#resolveError(
            spec,
            options,
            'failed to fetch remote tarball',
            {
              url: r.resolved,
              response,
            },
          )
        }

        const buf = response.buffer()

        // Compute integrity for remote/git-with-tarball deps
        const computed = ssri
          .fromData(buf, { algorithms: ['sha512'] })
          .toString()
        if (r.integrity && r.integrity !== computed) {
          throw error('Integrity check failure', {
            code: 'EINTEGRITY',
            spec,
            url: r.resolved,
            wanted: r.integrity,
            found: computed,
          })
        }
        r.integrity = computed as Integrity

        try {
          await (await this.getTarPool()).unpack(buf, target)
        } catch (er) {
          throw this.#resolveError(
            spec,
            options,
            'remote tar unpack failed',
            { cause: er },
          )
        }
        return r
      }
      case 'file': {
        // if it's a directory, then "extract" means "symlink"
        const { file } = f
        /* c8 ignore start - asserted in resolve() */
        if (file === undefined)
          throw this.#resolveError(spec, options, 'no file path')
        /* c8 ignore stop */
        const path = pathResolve(from, file)
        const st = await stat(path)
        if (st.isFile()) {
          try {
            await (await this.getTarPool()).unpackFile(path, target)
          } catch (er) {
            throw this.#resolveError(
              spec,
              options,
              'tar unpack failed',
              { cause: er },
            )
          }
        } else if (st.isDirectory()) {
          const rel = relative(dirname(target), path)
          await symlink(rel, target, 'dir')
          /* c8 ignore start */
        } else {
          throw this.#resolveError(
            spec,
            options,
            'file: specifier does not resolve to directory or tarball',
          )
        }
        /* c8 ignore stop */
        return r
      }
      case 'workspace': {
        const ws = this.#getWS(spec, options)
        const rel = relative(dirname(target), ws.fullpath)
        await symlink(rel, target, 'dir')
        return r
      }
    }
  }

  #getWS(spec: Spec, options: PackageInfoClientRequestOptions) {
    const { workspace } = spec
    /* c8 ignore start - asserted in resolve() */
    if (workspace === undefined)
      throw this.#resolveError(spec, options, 'no workspace ID')
    /* c8 ignore stop */
    if (!this.monorepo) {
      throw this.#resolveError(
        spec,
        options,
        'Not in a monorepo, cannot resolve workspace spec',
      )
    }
    const ws = this.monorepo.get(workspace)
    if (!ws) {
      throw this.#resolveError(spec, options, 'workspace not found', {
        wanted: workspace,
      })
    }
    return ws
  }

  /**
   * Return the manifest cache key for a spec and the current options.
   */
  #manifestCacheKey(
    spec: Spec,
    options: PackageInfoClientRequestOptions,
  ): string {
    let extra = ''
    if (options['node-version']) {
      extra += `${delimiter}node-version:${options['node-version']}`
    }
    if (options.os) {
      extra += `${delimiter}os:${options.os}`
    }
    if (options.arch) {
      extra += `${delimiter}arch:${options.arch}`
    }
    return encodeURIComponent(
      `${spec.registry ?? ''}${delimiter}${spec}${extra}`,
    )
  }

  /**
   * Conditionally return the path to the manifest cache file. The logic
   * to determine if caching should be skipped aligns with `pickManifest`
   * and is used to avoid caching manifest results that can be variable.
   */
  _manifestCachePath(
    spec: Spec,
    options: PackageInfoClientRequestOptions,
  ): string | undefined {
    if (options.before) {
      return
    }
    // a moving selector's result is variable, so don't cache it
    const f = spec.final
    if (isMovingSelector(f)) {
      return
    }
    const key = this.#manifestCacheKey(f, options)
    return pathResolve(this.#cachePath, 'package-info', key)
  }

  /**
   * Write a manifest cache file atomically (write to a temp file in
   * the same directory, then rename over the destination) so that
   * concurrent readers never observe a partially written manifest.
   * Freshness is tracked via the resulting file's mtime.
   */
  async #writeManifestCache(cachePath: string, json: string) {
    const tmp = `${cachePath}.${this.#manifestWriteRandom}.${this.#manifestWriteCount++}`
    try {
      try {
        await writeFile(tmp, json, 'utf8')
      } catch (err) {
        // in case the cache directory doesn't exist
        // just create it and retry
        if (!(
          err instanceof Error &&
          'code' in err &&
          err.code === 'ENOENT'
        )) {
          throw err
        }
        await mkdir(dirname(cachePath), { recursive: true })
        await writeFile(tmp, json, 'utf8')
      }
      await rename(tmp, cachePath)
    } catch {
      // failing to write the manifest cache is not an install failure
    }
  }

  async tarball(
    spec: Spec | string,
    options: PackageInfoClientExtractOptions = {},
  ): Promise<Buffer> {
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const f = spec.final

    switch (f.type) {
      case 'registry': {
        const { dist } = await this.manifest(spec, options)
        if (!dist)
          throw this.#resolveError(
            spec,
            options,
            `The registry manifest for ${spec} has no "dist" section, ` +
              `so no tarball can be resolved. The package version may be ` +
              `malformed or unpublished.`,
          )

        const { tarball, integrity } = dist
        if (!tarball) {
          throw this.#resolveError(
            spec,
            options,
            `The registry manifest for ${spec} is missing a tarball URL ` +
              `(dist.tarball). The package version may be malformed or ` +
              `unpublished in this registry.`,
          )
        }

        const fetchTarball = async (useCache?: false) => {
          const trustIntegrity =
            this.#trustedIntegrities.get(tarball) === integrity

          const response = await (
            await this.getRegistryClient()
          ).request(tarball, {
            ...options,
            integrity,
            trustIntegrity,
            ...(useCache === false ? { useCache } : {}),
          })
          if (response.statusCode !== 200) {
            throw this.#resolveError(
              spec,
              options,
              `Registry returned HTTP ${response.statusCode} when ` +
                `fetching the tarball for ${spec} at ${tarball}. The ` +
                `version may have been unpublished, or the registry may ` +
                `be misconfigured or unreachable.`,
              { response, url: tarball },
            )
          }

          // if we don't already trust it, but it's valid, start
          // trusting it
          if (
            !trustIntegrity &&
            response.checkIntegrity({ spec, url: tarball })
          ) {
            this.#trustedIntegrities.set(tarball, response.integrity)
          }

          const buf = response.buffer()

          // Same as extract(): only hash network-delivered bodies.
          if (integrity && !response.fromCache) {
            const hash = createHash('sha512')
            hash.update(buf)
            const computed: Integrity = `sha512-${hash.digest('base64')}`
            /* c8 ignore start - defense-in-depth (see extract) */
            if (computed !== integrity) {
              throw error('Tarball integrity check failed', {
                code: 'EINTEGRITY',
                spec,
                url: tarball,
                wanted: integrity,
                found: computed,
              })
            }
            /* c8 ignore stop */
          }

          return buf
        }

        try {
          return await fetchTarball()
        } catch (er) {
          if (
            er instanceof Error &&
            'cause' in er &&
            (er.cause as Record<string, unknown> | undefined)
              ?.code === 'EINTEGRITY'
          ) {
            return await fetchTarball(false)
          }
          throw er
        }
      }

      case 'git': {
        const {
          remoteURL,
          gitRemote,
          gitCommittish,
          gitSelectorParsed,
        } = f
        const s: Spec = spec
        if (!remoteURL) {
          if (!gitRemote) {
            throw this.#resolveError(
              spec,
              options,
              'no remote on git: specifier',
            )
          }
          const { path } = gitSelectorParsed ?? {}
          return await this.#tmpdir(async dir => {
            await clone(gitRemote, gitCommittish, dir + '/package', {
              spec: s,
            })
            let cwd = dir
            if (path !== undefined) {
              const src = pathResolve(dir, 'package', path)
              cwd = dirname(src)
              const pkg = pathResolve(cwd, 'package')
              if (src !== pkg) {
                const rand = randomBytes(6).toString('hex')
                // faster than deleting
                await rename(pkg, pkg + rand).catch(() => {})
                await rename(src, pkg)
              }
            }
            return tarC({ cwd, gzip: true }, ['package']).concat()
          })
        }
        // fallthrough if remoteURL set
      }

      case 'remote': {
        const { remoteURL } = f
        if (!remoteURL) {
          throw this.#resolveError(spec, options)
        }
        const response = await (
          await this.getRegistryClient()
        ).request(remoteURL)
        if (response.statusCode !== 200) {
          throw this.#resolveError(
            spec,
            options,
            'failed to fetch URL',
            { response, url: remoteURL },
          )
        }
        return response.buffer()
      }

      case 'file': {
        const { file } = f
        if (file === undefined)
          throw this.#resolveError(spec, options, 'no file path')
        const { from = this.#projectRoot } = options
        const path = pathResolve(from, file)
        const st = await stat(path)
        if (st.isDirectory()) {
          const p = dirname(path)
          const b = basename(path)
          // TODO: Pack properly, ignore stuff, bundleDeps, etc
          return tarC({ cwd: p, gzip: true }, [b]).concat()
        }
        return readFile(path)
      }

      case 'workspace': {
        // TODO: Pack properly, ignore stuff, bundleDeps, etc
        const ws = this.#getWS(spec, options)
        const p = dirname(ws.fullpath)
        const b = basename(ws.fullpath)
        return tarC({ cwd: p, gzip: true }, [b]).concat()
      }
    }
  }

  async manifest(
    spec: Spec | string,
    options: PackageInfoClientRequestOptions = {},
  ) {
    const { from = this.#projectRoot } = options
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const f = spec.final

    switch (f.type) {
      case 'registry': {
        // Check if manifest is cached, if so just return it earlier
        const cachePath = this._manifestCachePath(spec, options)
        if (cachePath) {
          try {
            // Cache file exists, read and return it. Freshness is
            // tracked via the file's mtime, so the file content is
            // exactly the manifest and can be returned as parsed.
            const [st, cached] = await Promise.all([
              stat(cachePath),
              readFile(cachePath, 'utf8'),
            ])
            const json = JSON.parse(cached) as Manifest & {
              __VLT_MANIFEST_CACHE_TIMESTAMP?: number
            }
            // removes the cache file if older than its maximum age.
            // entries written by older clients embed a timestamp in
            // the manifest itself; treat those as expired so they get
            // rewritten in the mtime-tracked format.
            if (
              st.mtimeMs < this.#manifestCacheMinAge ||
              json.__VLT_MANIFEST_CACHE_TIMESTAMP !== undefined
            ) {
              this.#manifestWritePaths.delete(cachePath)
              void unlink(cachePath).catch(() => {})
              throw new Error('manifest cache expired')
            }
            return json
          } catch {
            // Cache miss, fetch from packument
          }
        }

        const stable = stableSuffices(spec, options)
        let mani = pickManifest(
          await this.packument(f, { ...options, stable }),
          spec,
          options,
        )
        // the stable packument hides prerelease-only packages and
        // dist-tags that point at a prerelease; the full one has them
        if (!mani && stable) {
          mani = pickManifest(
            await this.packument(f, options),
            spec,
            options,
          )
        }
        if (!mani) throw this.#resolveError(spec, options)

        // Cache the manifest data. Skip paths already written this
        // run — first writer wins, avoiding duplicate serialization
        // and racing writers for the same path.
        if (cachePath && !this.#manifestWritePaths.has(cachePath)) {
          this.#manifestWritePaths.add(cachePath)
          void this.#writeManifestCache(
            cachePath,
            JSON.stringify(mani),
          )
        }

        return mani
      }

      case 'git': {
        const {
          gitRemote,
          gitCommittish,
          remoteURL,
          gitSelectorParsed,
        } = f
        if (!remoteURL) {
          const s = spec
          if (!gitRemote)
            throw this.#resolveError(spec, options, 'no git remote')
          return await this.#tmpdir(async dir => {
            await clone(gitRemote, gitCommittish, dir, { spec: s })
            const { path } = gitSelectorParsed ?? {}
            const pkgDir =
              path !== undefined ? pathResolve(dir, path) : dir
            return this.#readExtracted(pkgDir, s, options)
          })
        }
        // fallthrough to remote
      }

      case 'remote': {
        const { remoteURL } = f
        if (!remoteURL) {
          throw this.#resolveError(
            spec,
            options,
            'no remoteURL on remote specifier',
          )
        }
        const s = spec
        return await this.#tmpdir(async dir => {
          const response = await (
            await this.getRegistryClient()
          ).request(remoteURL)
          if (response.statusCode !== 200) {
            throw this.#resolveError(
              s,
              options,
              'failed to fetch URL',
              { response, url: remoteURL },
            )
          }
          const buf = response.buffer()

          // Compute integrity for remote/git-with-tarball deps
          const computed = ssri
            .fromData(buf, { algorithms: ['sha512'] })
            .toString()

          try {
            await (await this.getTarPool()).unpack(buf, dir)
          } catch (er) {
            throw this.#resolveError(
              s,
              options,
              'tar unpack failed',
              { cause: er },
            )
          }

          // return manifest with computed integrity
          const mani = this.#readExtracted(dir, s, options)
          mani.dist = { integrity: computed as Integrity }
          return mani
        })
      }

      case 'file': {
        const { file } = f
        if (file === undefined)
          throw this.#resolveError(spec, options, 'no file path')
        const path = pathResolve(from, file)
        const st = await stat(path)
        if (st.isDirectory()) {
          return this.packageJson.read(path)
        }
        const s = spec
        return await this.#tmpdir(async dir => {
          try {
            await (await this.getTarPool()).unpackFile(path, dir)
          } catch (er) {
            throw this.#resolveError(
              s,
              options,
              'tar unpack failed',
              { cause: er },
            )
          }
          return this.#readExtracted(dir, s, options)
        })
      }

      case 'workspace': {
        return this.#getWS(spec, options).manifest
      }
    }
  }

  async packument(
    spec: Spec | string,
    options: PackageInfoClientRequestOptions = {},
  ): Promise<Packument> {
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const f = spec.final
    switch (f.type) {
      // RevDoc is the equivalent of a packument for a git repo
      case 'git': {
        const { gitRemote } = f
        if (!gitRemote) {
          throw this.#resolveError(
            spec,
            options,
            'git remote could not be determined',
          )
        }
        const revDoc = await revs(gitRemote, {
          cwd: this.options.projectRoot,
        })
        if (!revDoc) throw this.#resolveError(spec, options)
        return asPackument(revDoc)
      }

      // these are all faked packuments
      case 'file':
      case 'workspace':
      case 'remote': {
        const manifest = await this.manifest(f, options)
        return {
          name: manifest.name ?? '',
          'dist-tags': {
            latest: manifest.version ?? '',
          },
          versions: {
            [manifest.version ?? '']: manifest as Manifest,
          },
        }
      }

      case 'registry': {
        const { registry, name } = f
        if (!registry) throw noRegistryError(spec)
        const pakuURL = new URL(name, registry)
        const forced = isMovingSelector(f)
        // a moving selector must not ride along on a non-forced request:
        // that one can settle to a fresh-but-stale cache hit, which is
        // exactly what forceRevalidate exists to avoid. the other
        // direction is fine -- a forced result is never staler.
        // costs at most one extra concurrent GET for the same packument
        // when both shapes are asked for at once.
        // Coalesced per URL, like the disk cache; the representation is
        // fixed by the accept header (see #fetchPackument). A full
        // packument already in flight also serves a stable request.
        if (options.stable) {
          const full = this.#packumentPromises.get(String(pakuURL))
          if (full && (!forced || full.forced)) return full.promise
          pakuURL.search = '?stable'
        }
        const packumentKey = String(pakuURL)
        const inflight = this.#packumentPromises.get(packumentKey)
        if (inflight && (!forced || inflight.forced))
          return inflight.promise
        const promise = this.#fetchPackument(spec, options, pakuURL)
        const record = { promise, forced }
        this.#packumentPromises.set(packumentKey, record)
        // Clean up once settled so we don't leak memory, unless a forced
        // request has since taken the slot over.
        // Use .then/.catch instead of .finally to avoid creating
        // an unhandled rejection from the derived promise.
        const clear = () => {
          if (this.#packumentPromises.get(packumentKey) === record) {
            this.#packumentPromises.delete(packumentKey)
          }
        }
        promise.then(clear, clear)
        return promise
      }
    }
  }

  async #fetchPackument(
    spec: Spec,
    options: PackageInfoClientRequestOptions,
    pakuURL: URL,
    useCache?: false,
  ): Promise<Packument> {
    // Request vlt's abbreviated packument, falling back to the full one:
    //   accept: application/vnd.vlt.packument-v1+json; q=1.0,
    //           application/json; q=0.8, */*
    //
    // npm's corgi (`application/vnd.npm.install-v1+json`) is never
    // requested. The version entry returned here becomes `node.manifest`
    // and is persisted to the hidden lockfile, and corgi drops `license`
    // and `time`, so graph queries like `[license=MPL-2.0]` could not
    // match a field that was never stored (shipped in 1.0.0-rc.33 via
    // #1692, reverted in #1707). The vlt type guarantees both, and a
    // registry that does not know it ignores it and serves the full
    // packument, so the graph gets every field it relies on either way.
    // The one shape difference is `scripts`, which the vlt type replaces
    // with `hasInstallScript`; reify reads the extracted package.json in
    // that case.
    //
    // The RegistryClient disk cache key is method + URL only, so every
    // packument request must use this same accept header, and the SWR
    // revalidation child re-requests the representation it was given.
    const response = await (
      await this.getRegistryClient()
    ).request(pakuURL, {
      headers: { accept: PACKUMENT_ACCEPT },
      ...(useCache === false ? { useCache } : {}),
      // costs a conditional GET per moving selector on an otherwise warm
      // cache, install included. 304s are cheap but not free; the
      // alternative is serving a dist tag that moved (#1656).
      ...(isMovingSelector(spec.final) ?
        { forceRevalidate: true }
      : {}),
    })
    if (response.statusCode !== 200) {
      throw this.#resolveError(
        spec,
        options,
        'failed to fetch packument',
        {
          url: pakuURL,
          response,
        },
      )
    }
    try {
      return response.json() as Packument
    } catch (er) {
      if (useCache !== false) {
        return this.#fetchPackument(spec, options, pakuURL, false)
      }
      throw er
    }
  }

  async resolve(
    spec: Spec | string,
    options: PackageInfoClientRequestOptions = {},
  ): Promise<Resolution> {
    const memoKey = String(spec)
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)

    const memo = this.#resolutions.get(memoKey)
    if (memo) return memo
    const f = spec.final

    switch (f.type) {
      case 'file': {
        const { file } = f
        if (!file || !f.file) {
          throw this.#resolveError(
            spec,
            options,
            'no path on file: specifier',
          )
        }
        const { from = this.#projectRoot } = options
        const resolved = pathResolve(from, f.file)
        const r = { resolved, spec }
        this.#resolutions.set(memoKey, r)
        return r
      }

      case 'remote': {
        const { remoteURL } = f
        if (!remoteURL)
          throw this.#resolveError(
            spec,
            options,
            'no URL in remote specifier',
          )
        const r = { resolved: remoteURL, spec }
        this.#resolutions.set(memoKey, r)
        return r
      }

      case 'workspace': {
        const ws = this.#getWS(spec, options)
        return {
          resolved: ws.fullpath,
          spec,
        }
      }

      case 'registry': {
        const mani = await this.manifest(spec, options)
        if (mani.dist) {
          const { integrity, tarball, signatures } = mani.dist
          if (tarball) {
            const r = {
              resolved: tarball,
              integrity,
              signatures,
              spec,
            }
            this.#resolutions.set(memoKey, r)
            return r
          }
        }
        throw this.#resolveError(spec, options)
      }

      case 'git': {
        const { gitRemote, remoteURL, gitSelectorParsed } = f
        if (remoteURL && gitSelectorParsed?.path === undefined) {
          // known git host with a tarball download endpoint
          const r = { resolved: remoteURL, spec }
          this.#resolutions.set(memoKey, r)
          return r
        }
        if (!gitRemote) {
          throw this.#resolveError(
            spec,
            options,
            'no remote on git specifier',
          )
        }
        const rev = await gitResolve(gitRemote, f.gitCommittish, {
          spec,
        })
        if (rev) {
          const r = {
            resolved: `${gitRemote}#${rev.sha}`,
            spec,
          }
          if (gitSelectorParsed) {
            r.resolved += Object.entries(gitSelectorParsed)
              .filter(([_, v]) => v)
              .map(([k, v]) => `::${k}:${v}`)
              .join('')
          }
          this.#resolutions.set(memoKey, r)
          return r
        }
        // have to actually clone somewhere
        const s: Spec = spec
        return this.#tmpdir(async tmpdir => {
          const sha = await clone(
            gitRemote,
            s.gitCommittish,
            tmpdir,
            {
              spec: s,
            },
          )
          const r = {
            resolved: `${gitRemote}#${sha}`,
            spec: s,
          }
          this.#resolutions.set(memoKey, r)
          return r
        })
      }
    }
  }

  /**
   * Read the manifest out of a directory we cloned or unpacked. Failures are
   * labeled with the spec, because the internal directory says nothing about
   * which dependency is at fault.
   */
  #readExtracted(
    dir: string,
    spec: Spec,
    options: PackageInfoClientRequestOptions,
  ) {
    try {
      return this.packageJson.read(dir)
    } catch (er) {
      throw this.#resolveError(
        spec,
        options,
        'invalid package manifest',
        { cause: er },
      )
    }
  }

  async #tmpdir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const p = `package-info/${randomBytes(6).toString('hex')}`
    const dir = xdg.runtime(p)
    try {
      return await fn(dir)
    } finally {
      // intentionally do not await
      void rm(dir, { recursive: true, force: true })
    }
  }

  // error resolving
  #resolveError(
    spec?: Spec,
    options: PackageInfoClientRequestOptions = {},
    message = 'Could not resolve',
    extra: ErrorCauseOptions = {},
  ) {
    const { from = this.#projectRoot } = options
    const er = error(
      message,
      {
        code: 'ERESOLVE',
        spec,
        from,
        ...extra,
      },
      this.#resolveError,
    )
    return er
  }
}
