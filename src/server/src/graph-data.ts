import { resolve } from 'node:path'
import { actual } from '@vltpkg/graph'
import { getProjectData } from '../../project/src/get-project-data.ts'
import { SecurityArchive } from '@vltpkg/security-archive'
import { rmSync, writeFileSync } from 'node:fs'

import type { ActualLoadOptions } from '@vltpkg/graph'
import type { Path } from 'path-scurry'

export type GraphDataOptions = ActualLoadOptions

export type GraphProjectData = {
  tools: string[]
  vltInstalled: boolean
}

export const updateGraphData = async (
  options: ActualLoadOptions,
  tmp: string,
  hasDashboard: boolean,
) => {
  const { projectRoot, scurry } = options
  const folder = scurry.lstatSync(projectRoot)
  const result =
    folder ?
      await getGraphData(options, hasDashboard, folder)
    : {
        hasDashboard,
        importers: [],
        lockfile: {},
        projectInfo: {
          tools: [],
          vltInstalled: false,
        },
        securityArchive: undefined,
      }

  const graphJson = JSON.stringify(result, null, 2)
  rmSync(resolve(tmp, 'graph.json'), { force: true })
  writeFileSync(resolve(tmp, 'graph.json'), graphJson)
}

const getGraphData = async (
  options: ActualLoadOptions,
  hasDashboard: boolean,
  folder: Path,
) => {
  const { packageJson, projectRoot, scurry } = options
  const mainManifest = packageJson.read(projectRoot)
  const graph = actual.load({
    ...options,
    mainManifest,
    loadManifests: true,
    skipHiddenLockfile: false,
    skipLoadingNodesOnModifiersChange: false,
  })
  const nodes = [...graph.nodes.values()]
  const importers = [...graph.importers]
  const securityArchive = await SecurityArchive.start({ nodes })

  return {
    hasDashboard,
    importers,
    lockfile: graph,
    projectInfo: getProjectData({ packageJson, scurry }, folder),
    securityArchive,
  }
}

export const loadGraph = (options: ActualLoadOptions) => {
  const { packageJson, projectRoot } = options
  const mainManifest = packageJson.read(projectRoot)
  return actual.load({
    ...options,
    mainManifest,
    loadManifests: true,
    skipHiddenLockfile: false,
    skipLoadingNodesOnModifiersChange: false,
  })
}

export { getProjectData }
