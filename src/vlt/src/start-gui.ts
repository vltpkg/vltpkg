import type { VltServerListening } from '@vltpkg/server'
import { createServer } from '@vltpkg/server'
import { urlOpen } from '@vltpkg/url-open'
import type { PathScurry } from 'path-scurry'
import type { LoadedConfig } from './config/index.ts'
import { stdout } from './output.ts'

export const getDefaultStartingRoute = async (options: {
  startingRoute?: string
  projectRoot: string
  scurry: PathScurry
}) => {
  const { startingRoute, projectRoot, scurry } = options
  if (startingRoute) return startingRoute
  const stat = await scurry.lstat(`${projectRoot}/package.json`)
  return stat?.isFile() && !stat.isSymbolicLink() ?
      `/explore?query=${encodeURIComponent(':root')}`
    : '/dashboard'
}

export const startGUI = async (
  conf: LoadedConfig,
  startingRoute?: string,
) => {
  const server = createServer(conf.options)
  server.on('needConfigUpdate', dir => {
    conf.resetOptions(dir)
    ;(server as VltServerListening).updateOptions(conf.options)
  })
  const { projectRoot, scurry } = conf.options
  await server.start()
  stdout(`⚡️ vlt GUI running at ${server.address()}`)
  void urlOpen(
    server.address(
      await getDefaultStartingRoute({
        startingRoute,
        projectRoot,
        scurry,
      }),
    ),
  )
  return server
}
