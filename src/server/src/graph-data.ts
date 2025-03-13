import type { ActualLoadOptions } from '@vltpkg/graph'
import { actual } from '@vltpkg/graph'
import type { PackageJson } from '@vltpkg/package-json'
import { rmSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import type { Path, PathBase, PathScurry } from 'path-scurry'
import type { ProjectTools } from './project-tools.ts'
import { inferTools } from './project-tools.ts'

export type GraphDataOptions = ActualLoadOptions

export type GraphProjectData = {
  tools: ProjectTools[]
  vltInstalled: boolean
}

export const updateGraphData = (
  options: ActualLoadOptions,
  tmp: string,
  hasDashboard: boolean,
) => {
  const { projectRoot, scurry } = options
  const folder = scurry.lstatSync(projectRoot)
  const result =
    folder ?
      getGraphData(options, hasDashboard, folder)
    : {
        hasDashboard,
        importers: [],
        lockfile: {},
        projectInfo: {
          tools: [],
          vltInstalled: false,
        },
      }

  const graphJson = JSON.stringify(result, null, 2)
  rmSync(resolve(tmp, 'graph.json'), { force: true })
  writeFileSync(resolve(tmp, 'graph.json'), graphJson)
}

const getGraphData = (
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
  })
  const importers = [...graph.importers]

  return {
    hasDashboard,
    importers,
    lockfile: graph,
    projectInfo: getProjectData({ packageJson, scurry }, folder),
  }
}

const getProjectData = (
  {
    packageJson,
    scurry,
  }: { packageJson: PackageJson; scurry: PathScurry },
  folder: PathBase,
) => {
  return {
    tools: inferTools(
      packageJson.read(folder.fullpath()),
      folder,
      scurry,
    ),
    vltInstalled:
      !!folder
        .resolve('node_modules/.vlt')
        .lstatSync()
        ?.isDirectory() ||
      !!folder
        .resolve('node_modules/.vlt-lock.json')
        .lstatSync()
        ?.isFile(),
  }
}
