import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import { error } from '@vltpkg/error-cause'
import { clone, resolve as gitResolve, revs } from '@vltpkg/git'
import { PackageJson } from '@vltpkg/package-json'
import type { PickManifestOptions } from '@vltpkg/pick-manifest'
import { pickManifest } from '@vltpkg/pick-manifest'
import type {
  RegistryClientOptions,
  RegistryClientRequestOptions,
} from '@vltpkg/registry-client'
import { RegistryClient } from '@vltpkg/registry-client'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import { Pool } from '@vltpkg/tar'
import type { Integrity, Manifest, Packument } from '@vltpkg/types'
import { asPackument, isIntegrity } from '@vltpkg/types'
import { Monorepo } from '@vltpkg/workspaces'
import { XDG } from '@vltpkg/xdg'
import { randomBytes } from 'node:crypto'
import { readFile, rm, stat, symlink } from 'node:fs/promises'
import {
  basename,
  dirname,
  resolve as pathResolve,
  relative,
} from 'node:path'
import { create as tarC } from 'tar'
import { rename } from './rename.ts'

const xdg = new XDG('vlt')

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
  }

export type PackageInfoClientExtractOptions =
  PackageInfoClientRequestOptions & {
    integrity?: Integrity
    resolved?: string
  }

export class PackageInfoClient {
  #registryClient?: RegistryClient
  #projectRoot: string
  #tarPool?: Pool
  options: PackageInfoClientOptions
  #resolutions = new Map<string, Resolution>()
  packageJson: PackageJson
  monorepo?: Monorepo
  #trustedIntegrities = new Map<string, Integrity>()

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
  }

  async extract(
    spec: Spec | string,
    target: string,
    options: PackageInfoClientExtractOptions = {},
  ): Promise<Resolution> {
    if (typeof spec === 'string')
      spec = Spec.parse(spec, this.options)
    const { from = this.#projectRoot, integrity, resolved } = options
    const f = spec.final
    const r =
      integrity && resolved ?
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

      case 'registry':
      case 'remote': {
        const trustIntegrity =
          this.#trustedIntegrities.get(r.resolved) === r.integrity

        const response = await this.registryClient.request(
          r.resolved,
          {
            integrity: r.integrity,
            trustIntegrity,
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

        // if it's not trusted already, but valid, start trusting
        if (
          !trustIntegrity &&
          response.checkIntegrity({ spec, url: resolved })
        ) {
          this.#trustedIntegrities.set(r.resolved, response.integrity)
        }

        try {
          await this.tarPool.unpack(response.buffer(), target)
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
            await this.tarPool.unpack(
              await this.tarball(spec, options),
              target,
            )
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
            'no dist object found in manifest',
          )

        const { tarball, integrity } = dist
        if (!tarball) {
          throw this.#resolveError(
            spec,
            options,
            'no tarball found in manifest.dist',
          )
        }

        const trustIntegrity =
          this.#trustedIntegrities.get(tarball) === integrity

        const response = await this.registryClient.request(tarball, {
          ...options,
          integrity,
          trustIntegrity,
        })
        if (response.statusCode !== 200) {
          throw this.#resolveError(
            spec,
            options,
            'failed to fetch tarball',
            { response, url: tarball },
          )
        }

        // if we don't already trust it, but it's valid, start trusting it
        if (
          !trustIntegrity &&
          response.checkIntegrity({ spec, url: tarball })
        ) {
          this.#trustedIntegrities.set(tarball, response.integrity)
        }

        return response.buffer()
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
        const mani = pickManifest(
          await this.packument(f, options),
          spec,
          options,
        )
        if (!mani) throw this.#resolveError(spec, options)
        const { integrity, tarball } = mani.dist ?? {}
        if (isIntegrity(integrity) && tarball) {
          const registryOrigin = new URL(String(f.registry)).origin
          const tgzOrigin = new URL(tarball).origin
          // if it comes from the same origin, trust the integrity
          if (tgzOrigin === registryOrigin) {
            this.#trustedIntegrities.set(tarball, integrity)
          }
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
            return this.packageJson.read(pkgDir)
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
              { cause: er },
            )
          }
          return this.packageJson.read(dir)
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
            await this.tarPool.unpack(await readFile(path), dir)
          } catch (er) {
            throw this.#resolveError(
              s,
              options,
              'tar unpack failed',
              { cause: er },
            )
          }
          return this.packageJson.read(dir)
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
        const pakuURL = new URL(name, registry)
        const response = await this.registryClient.request(pakuURL, {
          headers: {
            accept: 'application/json',
          },
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
        return response.json() as Packument
      }
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
