import { resolve } from 'node:path'
import LZString from 'lz-string'
import { createServer } from '@vltpkg/server'
import { urlOpen } from '@vltpkg/url-open'
import { stdout } from './output.ts'
import type { PathScurry } from 'path-scurry'
import type { LoadedConfig } from './config/index.ts'
import type { VltServerListening } from '@vltpkg/server'

export const getDefaultStartingRoute = async (options: {
  queryString?: string
  startingRoute?: string
  projectRoot: string
  scurry: PathScurry
}) => {
  const {
    queryString = ':root',
    startingRoute,
    projectRoot,
    scurry,
  } = options
  if (startingRoute) return startingRoute
  const stat = await scurry.lstat(`${projectRoot}/package.json`)
  return stat?.isFile() && !stat.isSymbolicLink() ?
      `/explore/${LZString.compressToEncodedURIComponent(queryString)}/overview`
    : '/'
}

const getAssetsDir = () => {
  /* c8 ignore start */
  if (process.env.__VLT_INTERNAL_GUI_ASSETS_DIR) {
    return resolve(
      import.meta.dirname,
      process.env.__VLT_INTERNAL_GUI_ASSETS_DIR,
    )
  }
  /* c8 ignore stop */
}

export const startGUI = async (
  conf: LoadedConfig,
  startingRoute?: string,
) => {
  const server = createServer({
    ...conf.options,
    assetsDir: getAssetsDir(),
    loadedConfig: conf,
  })
  server.on('needConfigUpdate', dir => {
    conf.resetOptions(dir)
    const listeningServer = server as VltServerListening
    listeningServer.updateOptions(conf.options)
    const reload = (conf as { reloadFromDisk?: () => Promise<void> })
      .reloadFromDisk
    if (reload) {
      void reload()
        .then(() => listeningServer.updateOptions(conf.options))
        .catch(() => {})
    }
  })
  const { projectRoot, scurry } = conf.options
  await server.start()
  stdout(`⚡️ vlt GUI running at ${server.address()}`)
  void urlOpen(
    server.address(
      await getDefaultStartingRoute({
        queryString: conf.values.target,
        startingRoute,
        projectRoot,
        scurry,
      }),
    ),
  )
  return server
}
