import { getUser } from '@vltpkg/git'
import { getAuthorFromGitUser } from '@vltpkg/init'
import type { PackageJson } from '@vltpkg/package-json'
import type { Manifest } from '@vltpkg/types'
import { writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import type { PathBase, PathScurry } from 'path-scurry'
import { getReadablePath } from './get-readable-path.ts'
import type { ProjectTools } from './project-tools.ts'
import { inferTools } from './project-tools.ts'
import { readProjectFolders } from './read-project-folders.ts'

// TODO: rather than writing a dashboard.json file, keep the dashboard
// info in memory, and make a handle to the Dashboard object persist in
// the VltServer class. Then, if we get a request for /dashboard.json,
// just server it from the dashboard object without reading static file.

export type DashboardProjectData = {
  name: string
  readablePath: string
  path: string
  manifest: Manifest
  tools: ProjectTools[]
  mtime?: number
}

export type DashboardOptions = {
  'dashboard-root': string[]
  scurry: PathScurry
  packageJson: PackageJson
  publicDir: string
}

export type DashboardLocation = {
  path: string
  readablePath: string
}

export type DashboardData = {
  cwd: string
  dashboardProjectLocations: DashboardLocation[]
  defaultAuthor: string
  projects: DashboardProjectData[]
}

/**
 * Class to handle updating and formatting dashboard data
 */
export class Dashboard {
  packageJson: PackageJson
  dashboardRoot: string[]
  scurry: PathScurry
  publicDir: string

  constructor(options: DashboardOptions) {
    const {
      'dashboard-root': dashboardRoot,
      scurry,
      packageJson,
      publicDir,
    } = options
    this.packageJson = packageJson
    this.dashboardRoot = dashboardRoot
    if (!this.dashboardRoot.length) this.dashboardRoot = [homedir()]
    this.scurry = scurry
    this.publicDir = publicDir
  }

  async update() {
    // TODO: projectFolders should be set once, not every time
    // Store the mtime for every folder that we find, and only update
    // the ones that are actually modified.
    const dashboard = await this.format(
      await readProjectFolders({
        scurry: this.scurry,
        userDefinedProjectPaths: this.dashboardRoot,
      }),
    )
    const hasDashboard = dashboard.projects.length > 0

    // only need to write the file if we're not about to delete it.
    if (!hasDashboard) {
      await rm(resolve(this.publicDir, 'dashboard.json'), {
        force: true,
      })
    } else {
      const dashboardJson = JSON.stringify(dashboard, null, 2)
      writeFileSync(
        resolve(this.publicDir, 'dashboard.json'),
        dashboardJson,
      )
    }

    return hasDashboard
  }

  async format(projectFolders: PathBase[]): Promise<DashboardData> {
    const userDefinedProjectPaths = this.dashboardRoot.map(
      path =>
        ({
          path,
          readablePath: getReadablePath(path),
        }) as DashboardLocation,
    )

    const result: DashboardData = {
      cwd: process.cwd(),
      dashboardProjectLocations: projectFolders
        .map((dir: PathBase) => {
          const path = dir.resolve('../').fullpath()
          const res: DashboardLocation = {
            path,
            readablePath: getReadablePath(path),
          }
          return res
        })
        .concat(userDefinedProjectPaths)
        .reduce<DashboardLocation[]>((acc, curr) => {
          if (acc.every(obj => obj.path !== curr.path)) {
            acc.push(curr)
          }
          return acc
        }, [])
        .sort(
          (a, b) => a.readablePath.length - b.readablePath.length,
        ),
      defaultAuthor: getAuthorFromGitUser(
        await getUser().catch(() => undefined),
      ),
      projects: [],
    }

    for (const folder of projectFolders) {
      const projectData = this.getProjectData(folder)
      if (projectData) {
        result.projects.push(projectData)
      }
    }

    return result
  }

  getProjectData(folder: PathBase): DashboardProjectData | undefined {
    let manifest
    try {
      manifest = this.packageJson.read(folder.fullpath())
    } catch {
      return
    }
    const path = folder.fullpath()
    return {
      name: manifest.name || folder.name,
      readablePath: getReadablePath(path),
      path,
      manifest,
      tools: inferTools(manifest, folder, this.scurry),
      mtime: folder.lstatSync()?.mtimeMs,
    }
  }
}
