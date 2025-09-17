import { homedir } from 'node:os'
import { parse, posix, resolve } from 'node:path'
import type { ActualLoadOptions } from '@vltpkg/graph'
import { actual } from '@vltpkg/graph'
import type { PackageJson } from '@vltpkg/package-json'
import { SecurityArchive } from '@vltpkg/security-archive'
import { rmSync, writeFileSync } from 'node:fs'
import type { Path, PathBase, PathScurry } from 'path-scurry'
import type { ProjectTools } from './project-tools.ts'
import { inferTools } from './project-tools.ts'

// In restricted environments (like locked-down Codespaces),
// homedir() might fail. Fall back to parent directory.
let foundHome
try {
  foundHome = posix.format(parse(homedir()))
  /* c8 ignore next 3 */
} catch {}
const home =
  foundHome ?? posix.dirname(posix.format(parse(process.cwd())))

export type GraphDataOptions = ActualLoadOptions

export type GraphProjectData = {
  tools: ProjectTools[]
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

export const getProjectData = (
  {
    packageJson,
    scurry,
  }: { packageJson: PackageJson; scurry: PathScurry },
  folder: PathBase,
) => {
  return {
    root: folder.fullpathPosix(),
    homedirRelativeRoot: posix.relative(home, folder.fullpathPosix()),
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
