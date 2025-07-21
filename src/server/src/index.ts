import { error } from '@vltpkg/error-cause'
import EventEmitter from 'node:events'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { rm } from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, relative, resolve } from 'node:path'
import { Dashboard } from './dashboard.ts'
import { AppDataManager } from './app-data.ts'
import { getAssetsDir } from './get-assets-dir.ts'
import { updateGraphData } from './graph-data.ts'
import { handleRequest } from './handle-request.ts'
import { listenCarefully } from './listen-carefully.ts'
import { Config } from '@vltpkg/cli-sdk/config'
import { ConfigManager } from './config-data.ts'

import type { SecurityArchive } from '@vltpkg/security-archive'
import type {
  ActualLoadOptions,
  InstallOptions,
  UninstallOptions,
} from '@vltpkg/graph'
import type { PackageJson } from '@vltpkg/package-json'
import type { Server } from 'node:http'
import type { LoadedConfig } from '@vltpkg/cli-sdk/config'

export const createServer = (options: VltServerOptions) =>
  new VltServer(options)

export type VltServerOptions = InstallOptions &
  UninstallOptions &
  ActualLoadOptions & {
    // TODO: this should not be in the options object, because they're not
    // configurable, really.
    // They should be fixed predictable locations in XDG somewhere, and then
    // removed from here.
    assetsDir?: string
    publicDir?: string
    'dashboard-root'?: string[]
    packageJson: PackageJson
    loadedConfig?: LoadedConfig
  }

export type VltServerStartOptions = {
  port?: number
}

export type VltServerListening = VltServer & {
  publicDir: string
  assetsDir: string
  port: number
  config: ConfigManager
}

export type VltServerNotListening = VltServer & {
  publicDir: undefined
  port: undefined
}

/**
 * This class handles the starting and stopping of the server, but the actual
 * response handling is all done in the handleRequest function.
 */
export class VltServer extends EventEmitter<{
  needConfigUpdate: [string]
}> {
  #rootAddress?: string

  dashboard?: Dashboard
  appData?: AppDataManager
  config?: ConfigManager
  hasDashboard = false
  options: VltServerOptions
  port?: number
  server: Server
  publicDir?: string
  dashboardRoot: string[]
  assetsDir?: string
  securityArchive: SecurityArchive | undefined

  constructor(options: VltServerOptions) {
    super()
    this.options = options
    this.dashboardRoot = options['dashboard-root'] ?? []
    this.server = createHttpServer((req, res) =>
      // it must be listening if we got a request, of course
      handleRequest(req, res, this as VltServerListening),
    )
  }

  listening(): this is VltServerListening {
    return this.server.listening
  }

  address(path = '/'): string {
    if (!this.listening()) {
      throw error('not listening, cannot calculate route')
    }
    return String(new URL(path, this.#rootAddress))
  }

  /**
   * If no port is specified, then it'll start counting up from 8000 until
   * it finds one that does not fail with EADDRINUSE.
   */
  async start({ port = 8000 }: VltServerStartOptions = {}) {
    if (this.listening()) {
      throw error('server already listening')
    }

    this.port = await listenCarefully(this.server, port)
    if (!this.listening()) {
      throw error('failed to start server')
    }
    this.#rootAddress = `http://localhost:${this.port}/`

    const { publicDir = tmpdir(), assetsDir = await getAssetsDir() } =
      this.options
    this.assetsDir = assetsDir
    this.publicDir = resolve(publicDir, `vltserver-${this.port}`)

    rmSync(this.publicDir, { recursive: true, force: true })
    mkdirSync(this.publicDir, { recursive: true })

    // This is the same as `cpSync(from, to, { recursive: true })`
    // but that does not work in Deno yet
    // (https://github.com/denoland/deno/issues/27494).
    for (const asset of readdirSync(assetsDir, {
      withFileTypes: true,
      recursive: true,
    })) {
      if (!asset.isFile()) continue
      const source = resolve(asset.parentPath, asset.name)
      const target = resolve(
        this.publicDir,
        relative(assetsDir, source),
      )
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, readFileSync(source))
    }

    await this.update()
  }

  async updateGraph(this: VltServerListening) {
    await updateGraphData(
      this.options,
      this.publicDir,
      this.hasDashboard,
    )
  }

  updateOptions(options: VltServerOptions) {
    this.options = options
  }

  async update(this: VltServerListening) {
    // Initialize app data manager
    this.appData = new AppDataManager({
      publicDir: this.publicDir,
    })
    await this.appData.update()

    // dashboard data is optional since the GUI might be started from a
    // project in order to just explore its graph data
    this.dashboard = new Dashboard({
      ...this.options,
      'dashboard-root': this.dashboardRoot,
      publicDir: this.publicDir,
    })
    this.hasDashboard = await this.dashboard.update()
    await this.updateGraph()

    // Initialize the config
    const conf = this.options.loadedConfig ?? (await Config.load())
    this.config = new ConfigManager({ config: conf })
  }

  async close() {
    const s = this
    if (!s.listening()) {
      throw error('server not listening')
    }
    s.server.closeAllConnections()
    s.server.close()
    if (this.listening()) {
      throw error('failed to close server')
    }

    /* c8 ignore start - generally always set by now */
    const rmPublicDir =
      this.publicDir ?
        rm(this.publicDir, { recursive: true, force: true })
      : undefined
    /* c8 ignore stop */
    this.publicDir = undefined
    this.assetsDir = undefined
    this.port = undefined
    this.#rootAddress = undefined
    this.hasDashboard = false
    await Promise.all([
      new Promise<void>((res, rej) =>
        this.server.once(
          'close',
          (er: null | undefined | NodeJS.ErrnoException) => {
            /* c8 ignore next - extremely unlikely */
            if (er) rej(er)
            else res()
          },
        ),
      ),
      rmPublicDir,
    ])
  }
}
