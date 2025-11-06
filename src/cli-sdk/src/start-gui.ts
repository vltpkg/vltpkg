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
  const res =
    stat?.isFile() && !stat.isSymbolicLink() ?
      `/explore/${LZString.compressToEncodedURIComponent(queryString)}/overview`
    : '/dashboard'
  return res
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
  /* c8 ignore start */
  const allowScripts =
    conf.get('allow-scripts') ?
      String(conf.get('allow-scripts'))
    : ':not(*)'
  /* c8 ignore stop */
  const server = createServer({
    ...conf.options,
    assetsDir: getAssetsDir(),
    loadedConfig: conf,
    allowScripts,
  })
  server.on('needConfigUpdate', async dir => {
    conf.resetOptions(dir)
    const listeningServer = server as VltServerListening
    listeningServer.updateOptions({ ...conf.options, allowScripts })
    await conf
      .reloadFromDisk()
      .then(() => {
        listeningServer.updateOptions({
          ...conf.options,
          allowScripts,
        })
      })
      .catch(() => {})
  })
  const { projectRoot, scurry } = conf.options
  await server.start()
  stdout(`⚡️ vlt UI running at ${server.address()}`)
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
