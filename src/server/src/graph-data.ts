import type { ActualLoadOptions } from '@vltpkg/graph'
import { actual } from '@vltpkg/graph'
import type { PackageJson } from '@vltpkg/package-json'
import { rmSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import type { PathBase, PathScurry } from 'path-scurry'
import { inferTools } from './project-tools.ts'
import type { ProjectTools } from './project-tools.ts'

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
  const { packageJson, projectRoot, scurry } = options
  const mainManifest = packageJson.read(projectRoot)
  const graph = actual.load({
    ...options,
    mainManifest,
    loadManifests: true,
  })
  const importers = [...graph.importers]
  const graphJson = JSON.stringify(
    {
      hasDashboard,
      importers,
      lockfile: graph,
      projectInfo: getProjectData(
        { packageJson, scurry },
        scurry.lstatSync(projectRoot),
      ),
    },
    null,
    2,
  )
  rmSync(resolve(tmp, 'graph.json'), { force: true })
  writeFileSync(resolve(tmp, 'graph.json'), graphJson)
}

const getProjectData = (
  {
    packageJson,
    scurry,
  }: { packageJson: PackageJson; scurry: PathScurry },
  folder?: PathBase,
) => {
  if (!folder) {
    return {
      tools: [],
      vltInstalled: false,
    }
  }

  return {
    tools: inferTools(
      packageJson.read(folder.fullpath()),
      folder,
      scurry,
    ),
    vltInstalled:
      !!scurry
        .lstatSync(folder.resolve('node_modules/.vlt'))
        ?.isDirectory() ||
      !!scurry
        .lstatSync(folder.resolve('node_modules/.vlt-lock.json'))
        ?.isFile(),
  }
}
