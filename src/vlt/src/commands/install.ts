import { actual, buildIdeal, reify } from '@vltpkg/graph'
import { LoadedConfig } from '../config/index.js'

export const usage = `vlt install [package ...]
Install the specified package, updating dependencies appropriately`

export const command = async (conf: LoadedConfig) => {
  // TODO: interpret arguments to add deps, or install in certain workspaces
  const graph = await buildIdeal({
    ...conf.options,
    loadManifests: true,
  })
  const act = actual.load({ ...conf.options, loadManifests: true })
  await reify({
    ...conf.options,
    actual: act,
    graph,
    loadManifests: true,
  })
}
