// TODO: the errors raised here are abjectly terrible. Improve them.
// They should indicate not just the spec that couldn't be resolved,
// but what specifically the problem was with it. Eg, a manifest lacking
// a 'dist' entry, should say that's the problem.

// TODO: handle workspace specs.

import { error, ErrorCauseObject } from '@vltpkg/error-cause'
import { clone, resolve as gitResolve, revs } from '@vltpkg/git'
import {
  Integrity,
  Manifest,
  Packument,
  pickManifest,
  PickManifestOptions,
} from '@vltpkg/pick-manifest'
import {
  RegistryClient,
  RegistryClientOptions,
} from '@vltpkg/registry-client'
import { Spec, type SpecOptions } from '@vltpkg/spec'
import { Pool } from '@vltpkg/tar'
import { randomBytes } from 'crypto'
import { readFile, rm, stat } from 'fs/promises'
import { homedir } from 'os'
import { basename, dirname, resolve as pathResolve } from 'path'
import { create as tarC } from 'tar'

export type Resolution = {
  resolved: string
  integrity?: Integrity
  signatures?: Exclude<Manifest['dist'], undefined>['signatures']
  spec: Spec
}

export interface PackageInfoClientOptions
  extends RegistryClientOptions,
    SpecOptions,
    PickManifestOptions {
  cwd?: string
}

export interface PackageInfoClientRequestOptions {
  from?: string
  fullMetadata?: boolean
}

// pull minified packuments if possible
const corgiDoc =
  'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*'
const fullDoc = 'application/json'

// provide some helper methods at the top level. Re-use the client if
// the same options are provided.
const clients = new Map<string, PackageInfoClient>()
const client = (
  o: PackageInfoClientOptions & PackageInfoClientRequestOptions = {},
) => {
  const { from: _, fullMetadata: __, ...opts } = o
  const key = JSON.stringify(
    Object.entries(opts).sort(([a], [b]) => a.localeCompare(b)),
  )
  const c = clients.get(key) ?? new PackageInfoClient(opts)
  clients.set(key, c)
  return c
}

export const packument = async (
  spec: string | Spec,
  options: PackageInfoClientOptions &
    PackageInfoClientRequestOptions = {},
): Promise<Packument> => client(options).packument(spec, options)

export const manifest = async (
  spec: string | Spec,
  options: PackageInfoClientOptions &
    PackageInfoClientRequestOptions = {},
): Promise<Manifest> => client(options).manifest(spec, options)

export const resolve = async (
  spec: string | Spec,
  options: PackageInfoClientOptions &
    PackageInfoClientRequestOptions = {},
): Promise<Resolution> => client(options).resolve(spec, options)

export const tarball = async (
  spec: string | Spec,
  options: PackageInfoClientOptions &
    PackageInfoClientRequestOptions = {},
): Promise<Buffer> => client(options).tarball(spec, options)

export const extract = async (
  spec: string | Spec,
  target: string,
  options: PackageInfoClientOptions &
    PackageInfoClientRequestOptions = {},
): Promise<Resolution> =>
  client(options).extract(spec, target, options)

export class PackageInfoClient {
  #registryClient?: RegistryClient
  #cwd: string
  #cache: string
  #tarPool?: Pool
  options: PackageInfoClientOptions
  #resolutions = new Map<string, Resolution>()

  get registryClient() {
    if (!this.#registryClient) {
      this.#registryClient = new RegistryClient(this.options)
    }
    return this.#registryClient
  }

  get tarPool() {
    if (!this.#tarPool) this.#tarPool = new Pool()
    return this.#tarPool
  }

  constructor(options: PackageInfoClientOptions = {}) {
    this.options = options
    this.#cwd = options.cwd || process.cwd()
    this.#cache =
      options.cache ?? pathResolve(homedir(), '.config/vlt/cache')
  }

  async extract(
    spec: string | Spec,
    target: string,
    options: PackageInfoClientRequestOptions = {},
  ): Promise<Resolution> {
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const f = spec.final
    const r = await this.resolve(spec, options)
    switch (f.type) {
      case 'git': {
        const { gitRemote, gitCommittish, remoteURL } = f
        if (!remoteURL) {
          /* c8 ignore start - Impossible, would throw on the resolve */
          if (!gitRemote)
            throw this.#resolveError(
              spec,
              options,
              'no remote on git: specifier',
            )
          /* c8 ignore stop */
          await clone(gitRemote, gitCommittish, target, { spec })
          await rm(target + '/.git', { recursive: true })
          return r
        }
        // fallthrough if a remote tarball url present
      }
      case 'registry':
      case 'remote': {
        const response = await this.registryClient.request(
          r.resolved,
          {
            integrity: r.integrity,
          },
        )
        if (response.statusCode !== 200) {
          throw this.#resolveError(
            spec,
            options,
            'failed to fetch tarball',
            {
              url: r.resolved,
              response,
            },
          )
        }
        try {
          await this.tarPool.unpack(response.buffer(), target)
        } catch (er) {
          throw this.#resolveError(
            spec,
            options,
            'tar unpack failed',
            { cause: er as Error },
          )
        }
        return r
      }
      case 'file':
      case 'workspace': {
        try {
          await this.tarPool.unpack(
            await this.tarball(spec, options),
            target,
          )
        } catch (er) {
          throw this.#resolveError(
            spec,
            options,
            'tar unpack failed',
            { cause: er as Error },
          )
        }
        return r
      }
    }
  }

  async tarball(
    spec: string | Spec,
    options: PackageInfoClientRequestOptions = {},
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
            'no dist object found in manifest',
          )
        //TODO: handle signatures as well as integrity
        const { tarball, integrity } = dist
        if (!tarball)
          throw this.#resolveError(
            spec,
            options,
            'no tarball found in manifest.dist',
          )
        const response = await this.registryClient.request(tarball, {
          integrity,
        })
        if (response.statusCode !== 200) {
          throw this.#resolveError(
            spec,
            options,
            'failed to fetch tarball',
            { response, url: tarball },
          )
        }
        return response.buffer()
      }
      case 'git': {
        const { remoteURL, gitRemote, gitCommittish } = f
        const s: Spec = spec
        if (!remoteURL) {
          if (!gitRemote)
            throw this.#resolveError(
              spec,
              options,
              'no remote on git: specifier',
            )
          return await this.#tmpdir(async dir => {
            await clone(gitRemote, gitCommittish, dir + '/package', {
              spec: s,
            })
            return tarC({ cwd: dir, gzip: true }, [
              'package',
            ]).concat() as Promise<Buffer>
          })
        }
        // fallthrough if remoteURL set
      }
      case 'remote': {
        const { remoteURL } = f
        if (!remoteURL) {
          throw this.#resolveError(spec, options)
        }
        const response = await this.registryClient.request(remoteURL)
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
        const { from = this.#cwd } = options
        const path = pathResolve(from, file)
        const st = await stat(path)
        if (st.isDirectory()) {
          const p = dirname(path)
          const b = basename(path)
          return tarC({ cwd: p, gzip: true }, [
            b,
          ]).concat() as Promise<Buffer>
        }
        return readFile(path)
      }
      case 'workspace': {
        throw error('not supported', {
          spec,
          todo: 'workspace tarball',
        })
      }
    }
  }

  async manifest(
    spec: string | Spec,
    options: PackageInfoClientRequestOptions = {},
  ): Promise<Manifest> {
    const { from = this.#cwd } = options
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const f = spec.final
    switch (f.type) {
      case 'registry': {
        const mani = pickManifest(
          await this.packument(f, options),
          spec,
        )
        if (!mani) throw this.#resolveError(spec, options)
        return mani
      }
      case 'git': {
        const { gitRemote, gitCommittish, remoteURL } = f
        if (!remoteURL) {
          const s = spec
          if (!gitRemote)
            throw this.#resolveError(spec, options, 'no git remote')
          return await this.#tmpdir(async dir => {
            await clone(gitRemote, gitCommittish, dir, { spec: s })
            const json = await readFile(dir + '/package.json', 'utf8')
            return JSON.parse(json) as Manifest
          })
        }
        // fallthrough to remote
      }
      case 'remote': {
        const { remoteURL } = f
        if (!remoteURL)
          throw this.#resolveError(
            spec,
            options,
            'no remoteURL on remote specifier',
          )
        const s = spec
        return await this.#tmpdir(async dir => {
          const response =
            await this.registryClient.request(remoteURL)
          if (response.statusCode !== 200) {
            throw this.#resolveError(
              s,
              options,
              'failed to fetch URL',
              { response, url: remoteURL },
            )
          }
          const buf = response.buffer()
          try {
            await this.tarPool.unpack(buf, dir)
          } catch (er) {
            throw this.#resolveError(
              s,
              options,
              'tar unpack failed',
              { cause: er as Error },
            )
          }
          const json = await readFile(dir + '/package.json', 'utf8')
          return JSON.parse(json) as Manifest
        })
      }
      case 'file': {
        const { file } = f
        if (file === undefined)
          throw this.#resolveError(spec, options, 'no file path')
        const path = pathResolve(from, file)
        const st = await stat(path)
        if (st.isDirectory()) {
          const json = await readFile(path + '/package.json', 'utf8')
          return JSON.parse(json) as Manifest
        }
        const s = spec
        return await this.#tmpdir(async dir => {
          try {
            await this.tarPool.unpack(await readFile(path), dir)
          } catch (er) {
            throw this.#resolveError(
              s,
              options,
              'tar unpack failed',
              { cause: er as Error },
            )
          }
          const json = await readFile(dir + '/package.json', 'utf8')
          return JSON.parse(json) as Manifest
        })
      }
      case 'workspace': {
        throw error('not supported', {
          spec,
          todo: 'workspace manifest',
        })
      }
    }
  }

  async packument(
    spec: string | Spec,
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
        const revDoc = await revs(gitRemote, this.options)
        if (!revDoc) throw this.#resolveError(spec, options)
        return revDoc as Packument
      }
      // these are all faked packuments
      case 'file':
      case 'workspace':
      case 'remote': {
        const manifest = await this.manifest(f, options)
        return {
          name: spec.name,
          'dist-tags': {
            latest: manifest.version,
          },
          versions: {
            [manifest.version]: manifest,
          },
        }
      }
      case 'registry': {
        const { registry, name } = f
        const pakuURL = new URL(name, registry)
        const accept = options.fullMetadata ? fullDoc : corgiDoc
        const response = await this.registryClient.request(pakuURL, {
          headers: { accept },
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
        return response.json()
      }
    }
  }

  async resolve(
    spec: string | Spec,
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
        if (!file)
          error('no path on file: specifier', {
            spec,
            code: 'ERESOLVE',
          })
        const { from = this.#cwd } = options
        const resolved = pathResolve(from, spec.file as string)
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
        // spec.name is the name of the workspace
        // spec.semver/range are set if it's a valid range
        // but if it's like 'workspace:^' then use whatever version
        // is found in the actual workspace at any given point.
        throw error('not supported', {
          spec,
          todo: 'workspace resolve',
        })
      }

      case 'registry': {
        const mani = await this.manifest(spec, options)
        if (mani?.dist) {
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
        const { gitRemote, remoteURL } = f
        if (remoteURL) {
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
        const rev = await gitResolve(gitRemote, spec.gitCommittish, {
          spec,
        })
        if (rev) {
          const r = {
            resolved: `${gitRemote}#${rev.sha}`,
            spec,
          }
          this.#resolutions.set(memoKey, r)
          return r
        }
        // have to actually clone somewhere
        const s: Spec = spec as Spec
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

  async #tmpdir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const dir = pathResolve(
      this.#cache,
      'package-info',
      randomBytes(6).toString('hex'),
    )
    try {
      return await fn(dir)
    } finally {
      rm(dir, { recursive: true, force: true })
    }
  }

  // error resolving
  #resolveError(
    spec?: Spec,
    options: PackageInfoClientRequestOptions = {},
    message: string = 'Could not resolve',
    extra: ErrorCauseObject = {},
  ) {
    const { from = this.#cwd } = options
    const er = error(message, {
      code: 'ERESOLVE',
      spec,
      from,
      ...extra,
    })
    Error.captureStackTrace(er, this.#resolveError)
    return er
  }
}
