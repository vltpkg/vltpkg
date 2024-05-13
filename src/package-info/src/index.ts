// TODO: the errors raised here are abjectly terrible. Improve them.
// They should indicate not just the spec that couldn't be resolved,
// but what specifically the problem was with it. Eg, a manifest lacking
// a 'dist' entry, should say that's the problem.

// TODO: handle workspace specs.

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
          if (!gitRemote) throw this.#resolveError(spec, options)
          /* c8 ignore stop */
          await clone(gitRemote, gitCommittish, target, { spec })
          await rm(target + '/.git', { recursive: true })
          return r
        }
        // fallthrough if a remote tarball url present
      }
      case 'registry':
      case 'remote': {
        await this.tarPool.unpack(
          (
            await this.registryClient.request(r.resolved, {
              integrity: r.integrity,
            })
          ).buffer(),
          target,
        )
        return r
      }
      case 'file':
      case 'workspace': {
        await this.tarPool.unpack(
          await this.tarball(spec, options),
          target,
        )
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
        if (!dist) throw this.#resolveError(spec, options)
        //TODO: handle signatures as well as integrity
        const { tarball, integrity } = dist
        if (!tarball) throw this.#resolveError(spec, options)
        const res = await this.registryClient.request(tarball, {
          integrity,
        })
        return res.buffer()
      }
      case 'git': {
        const { remoteURL, gitRemote, gitCommittish } = f
        const s: Spec = spec
        if (!remoteURL) {
          if (!gitRemote) throw this.#resolveError(spec, options)
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
        return (await this.registryClient.request(remoteURL)).buffer()
      }
      case 'file': {
        const { file } = f
        if (file === undefined)
          throw Object.assign(new Error('no file path'), { spec })
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
        throw new Error('todo: workspace tarball')
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
            throw Object.assign(new Error('no git remote'), { spec })
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
          throw Object.assign(new Error('no remote URL'), { spec })
        return await this.#tmpdir(async dir => {
          const res = await this.registryClient.request(remoteURL)
          const buf = res.buffer()
          await this.tarPool.unpack(buf, dir)
          const json = await readFile(dir + '/package.json', 'utf8')
          return JSON.parse(json) as Manifest
        })
      }
      case 'file': {
        const { file } = f
        if (file === undefined)
          throw Object.assign(new Error('no file path'), { spec })
        const path = pathResolve(from, file)
        const st = await stat(path)
        if (st.isDirectory()) {
          const json = await readFile(path + '/package.json', 'utf8')
          return JSON.parse(json) as Manifest
        }
        return await this.#tmpdir(async dir => {
          await this.tarPool.unpack(await readFile(path), dir)
          const json = await readFile(dir + '/package.json', 'utf8')
          return JSON.parse(json) as Manifest
        })
      }
      case 'workspace': {
        throw new Error('todo: workspace manifest')
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
          throw new Error(
            `git remote could not be determined: ${spec}`,
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
        const res = await this.registryClient.request(pakuURL, {
          headers: { accept },
        })
        return res.json()
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
          throw new Error(`no path on file: specifier: ${spec}`)
        const { from = this.#cwd } = options
        const resolved = pathResolve(from, spec.file as string)
        const r = { resolved, spec }
        this.#resolutions.set(memoKey, r)
        return r
      }

      case 'remote': {
        const { remoteURL } = f
        if (!remoteURL)
          throw new Error(`no URL in remote specifier: ${spec}`)
        const r = { resolved: remoteURL, spec }
        this.#resolutions.set(memoKey, r)
        return r
      }

      case 'workspace': {
        // spec.name is the name of the workspace
        // spec.semver/range are set if it's a valid range
        // but if it's like 'workspace:^' then use whatever version
        // is found in the actual workspace at any given point.
        throw new Error('TODO: workspace resolve')
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
          throw new Error(`no remote on git specifier: ${spec}`)
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
    spec: Spec,
    options: PackageInfoClientRequestOptions = {},
  ) {
    const { from = this.#cwd } = options
    const er = Object.assign(
      new Error(`Could not resolve: '${spec.name}@${spec.bareSpec}'`),
      { spec, from, code: 'ERESOLVE' },
    )
    Error.captureStackTrace(er, this.#resolveError)
    return er
  }
}
