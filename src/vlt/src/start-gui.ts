import { asDepID } from '@vltpkg/dep-id'
import {
  actual,
  asDependency,
  install,
  uninstall,
} from '@vltpkg/graph'
import type {
  AddImportersDependenciesMap,
  Dependency,
  RemoveImportersDependenciesMap,
  InstallOptions,
  UninstallOptions,
} from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'
import type { DependencyTypeShort } from '@vltpkg/types'
import { urlOpen } from '@vltpkg/url-open'
import { getUser } from '@vltpkg/git'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createServer, request } from 'node:http'
import type {
  IncomingMessage,
  ServerResponse,
  Server,
} from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert'
import { loadPackageJson } from 'package-json-from-dist'
import type { PathBase } from 'path-scurry'
import handler from 'serve-handler'
import type { ConfigOptions, LoadedConfig } from './config/index.ts'
import { stderr, stdout } from './output.ts'
import { readProjectFolders } from './read-project-folders.ts'
import { init, getAuthorFromGitUser } from '@vltpkg/init'
import {
  getDashboardProjectData,
  getReadablePath,
  getGraphProjectData,
} from './project-info.ts'
import type { DashboardProjectData } from './project-info.ts'

const HOST = 'localhost'
const PORT = 7017

const { version } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON,
) as {
  version: string
}

export type GUIInstallOptions = Record<
  string,
  Record<string, { version: string; type: DependencyTypeShort }>
>

export type GUIUninstallOptions = Record<string, Set<string>>

export type StartGUIOptions = {
  assetsDir?: string
  conf: LoadedConfig
  port?: number
  startingRoute?: string
  tmpDir?: string
}

export type DashboardLocation = {
  path: string
  readablePath: string
}

export type DashboardData = {
  cwd: string
  buildVersion: string
  dashboardProjectLocations: DashboardLocation[]
  defaultAuthor: string
  projects: DashboardProjectData[]
}

class AddImportersDependenciesMapImpl
  extends Map
  implements AddImportersDependenciesMap
{
  modifiedDependencies = false
}

class RemoveImportersDependenciesMapImpl
  extends Map
  implements RemoveImportersDependenciesMap
{
  modifiedDependencies = false
}

export const parseInstallOptions = (
  conf: LoadedConfig,
  args: GUIInstallOptions,
): [InstallOptions, AddImportersDependenciesMap] => {
  const addArgs = new AddImportersDependenciesMapImpl()
  for (const [importerId, deps] of Object.entries(args)) {
    const depMap = new Map<string, Dependency>()
    for (const [name, { version, type }] of Object.entries(deps)) {
      depMap.set(
        name,
        asDependency({
          spec: Spec.parse(name, version, conf.options),
          type,
        }),
      )
      addArgs.modifiedDependencies = true
    }
    addArgs.set(asDepID(importerId), depMap)
  }
  return [conf.options, addArgs]
}

export const parseUninstallOptions = (
  conf: LoadedConfig,
  args: GUIUninstallOptions,
): [UninstallOptions, RemoveImportersDependenciesMap] => {
  const removeArgs = new RemoveImportersDependenciesMapImpl()
  for (const [importerId, deps] of Object.entries(args)) {
    const depMap = new Set<string>()
    for (const name of deps) {
      depMap.add(name)
    }
    removeArgs.set(asDepID(importerId), depMap)
    removeArgs.modifiedDependencies = true
  }
  return [conf.options, removeArgs]
}

export const formatDashboardJson = async (
  projectFolders: PathBase[],
  conf: LoadedConfig,
) => {
  const userDefinedProjectPaths = (
    conf.values['dashboard-root']?.length ?
      conf.values['dashboard-root']
    : [homedir()]).map(
    path =>
      ({
        path,
        readablePath: getReadablePath(path),
      }) as DashboardLocation,
  )
  const result: DashboardData = {
    cwd: process.cwd(),
    buildVersion: version,
    dashboardProjectLocations: projectFolders
      .map((dir: PathBase) => {
        const path = dirname(dir.fullpath())
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
      .sort((a, b) => a.readablePath.length - b.readablePath.length),
    defaultAuthor: getAuthorFromGitUser(
      await getUser().catch(() => undefined),
    ),
    projects: [],
  }
  for (const folder of projectFolders) {
    const projectData = getDashboardProjectData(folder, conf)
    if (projectData) {
      result.projects.push(projectData)
    }
  }
  return result
}

const updateGraphData = (
  tmp: string,
  conf: LoadedConfig,
  hasDashboard: boolean,
) => {
  const { options } = conf
  const { monorepo, packageJson, projectRoot, scurry } = options
  const mainManifest = packageJson.read(projectRoot)
  const graph = actual.load({
    ...options,
    mainManifest,
    monorepo,
    loadManifests: true,
  })
  const importers = [...graph.importers]
  const folder = scurry.lstatSync(projectRoot)
  const graphJson = JSON.stringify(
    {
      hasDashboard,
      importers,
      lockfile: graph,
      projectInfo: getGraphProjectData(conf, folder),
    },
    null,
    2,
  )
  rmSync(resolve(tmp, 'graph.json'), { force: true })
  writeFileSync(resolve(tmp, 'graph.json'), graphJson)
}

const updateDashboardData = async (
  tmp: string,
  conf: LoadedConfig,
) => {
  const userDefinedProjectPaths = conf.values['dashboard-root'] ?? []
  const dashboard = await formatDashboardJson(
    await readProjectFolders({
      ...conf.options,
      userDefinedProjectPaths,
    }),
    conf,
  )
  const dashboardJson = JSON.stringify(dashboard, null, 2)
  writeFileSync(resolve(tmp, 'dashboard.json'), dashboardJson)
  return dashboard.projects.length > 0
}

const getDefaultStartingRoute = (options: ConfigOptions) => {
  const { projectRoot, scurry } = options
  const stat = scurry.lstatSync(`${projectRoot}/package.json`)
  return stat?.isFile() && !stat.isSymbolicLink() ?
      `/explore?query=${encodeURIComponent(':root')}`
    : '/dashboard'
}

/* c8 ignore start */
const createStaticHandler = ({
  assetsDir,
  publicDir,
}: {
  assetsDir: string
  publicDir: string
}) => {
  const opts = {
    cleanUrls: true,
    public: publicDir,
    rewrites: [
      { source: '/', destination: '/index.html' },
      { source: '/error', destination: '/index.html' },
      { source: '/explore', destination: '/index.html' },
      { source: '/dashboard', destination: '/index.html' },
      { source: '/queries', destination: '/index.html' },
      { source: '/labels', destination: '/index.html' },
      { source: '/new-project', destination: '/index.html' },
    ],
  }
  const errHandler = (err: unknown, res: ServerResponse) => {
    stderr(err)
    res.statusCode = 500
    res.end('Internal server error')
  }
  const staticHandler = (req: IncomingMessage, res: ServerResponse) =>
    handler(req, res, opts).catch((err: unknown) =>
      errHandler(err, res),
    )

  // It's important for this guard to check to not be destructured
  // because `infra/build` will replace the whole thing with `false`
  // causing it to be stripped entirely from production builds.
  if (process.env.__VLT_INTERNAL_LIVE_RELOAD) {
    // Generate a set of routes that should be proxied to the esbuild server
    const proxyRoutes = new Set(
      [
        // `/esbuild` is an SSE endpoint served by esbuild
        'esbuild',
        // Also proxy anything that currently exists in the assets dir
        ...readdirSync(assetsDir, {
          withFileTypes: true,
          recursive: true,
        })
          .filter(f => f.isFile())
          .map(f =>
            relative(assetsDir, resolve(f.parentPath, f.name)),
          ),
      ].map(p => `/${p}`),
    )
    return (req: IncomingMessage, res: ServerResponse) =>
      req.url && proxyRoutes.has(req.url) ?
        void req.pipe(
          request(
            {
              hostname: HOST,
              port: 7018,
              path: req.url,
              method: req.method,
              headers: req.headers,
            },
            proxy => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              res.writeHead(proxy.statusCode!, proxy.headers)
              proxy.pipe(res, { end: true })
            },
          ).on('error', err => {
            // If we get an ECONNREFUSED error, fallback to the static handler
            // since the esbuild server is not running
            if (
              err instanceof Error &&
              'code' in err &&
              err.code === 'ECONNREFUSED'
            ) {
              // In this case the /esbuild route is expected to fail so the
              // EventSource in the browser will be closed
              if (req.url === '/esbuild') {
                res.statusCode = 404
                return res.end()
              }
              return staticHandler(req, res)
            }
            errHandler(err, res)
          }),
          { end: true },
        )
      : staticHandler(req, res)
  }

  return staticHandler
}

/* c8 ignore start */
const getAssetsDir = () => {
  const fromEnv = process.env.__VLT_INTERNAL_GUI_ASSETS_DIR
  // workaround for the import.meta.resolve issue not working with tap
  if (process.env.TAP) {
    assert(
      fromEnv,
      'assets dir must be set from environment variable when running tests',
    )
  }
  if (fromEnv) {
    return resolve(import.meta.dirname, fromEnv)
  }
  return fileURLToPath(import.meta.resolve('@vltpkg/gui'))
}
/* c8 ignore stop */

export const startGUI = async ({
  conf,
  assetsDir = getAssetsDir(),
  port = PORT,
  startingRoute = undefined,
  tmpDir = tmpdir(),
}: StartGUIOptions) => {
  const tmp = resolve(tmpDir, 'vltgui')
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  // This is the same as `cpSync(assetsDir, tmp, { recursive: true })`
  // but that does not work in Deno yet (https://github.com/denoland/deno/issues/27494).
  for (const asset of readdirSync(assetsDir, {
    withFileTypes: true,
    recursive: true,
  })) {
    if (!asset.isFile()) continue
    const source = resolve(asset.parentPath, asset.name)
    const target = resolve(tmp, relative(assetsDir, source))
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, readFileSync(source))
  }

  // dashboard data is optional since the GUI might be started from a
  // project in order to just explore its graph data
  let hasDashboard = false

  const updateDashboard = async () => {
    try {
      hasDashboard = await updateDashboardData(tmp, conf)
      /* c8 ignore next */
    } catch {}
    if (!hasDashboard) {
      rmSync(resolve(tmp, 'dashboard.json'), { force: true })
    }
  }

  await updateDashboard()

  // reading graph data is optional since the command might be run from a
  // parend directory of any given project root, in which case the GUI is
  // going to render only the dashboard to start with
  try {
    updateGraphData(tmp, conf, hasDashboard)
  } catch {
    rmSync(resolve(tmp, 'graph.json'), { force: true })
  }

  const staticHandler = createStaticHandler({
    publicDir: tmp,
    assetsDir,
  })

  const server = createServer(async (req, res) => {
    const json = <T>(): Promise<T> =>
      new Promise(resolve => {
        req.setEncoding('utf8')
        let json = ''
        req.on('data', (d: string) => (json += d))
        req.on('end', () => resolve(JSON.parse(json) as T))
      })
    const jsonError = (
      errType: string,
      err: unknown,
      code: number,
    ) => {
      stderr(err)
      res.statusCode = code
      res.end(JSON.stringify(`${errType}\n${err}`))
    }
    const jsonOk = (result: string) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    }
    switch (`${req.method} ${req.url}`) {
      case 'POST /select-project': {
        const data = await json<{ path: unknown }>()
        conf.resetOptions(String(data.path))
        await updateDashboard()
        updateGraphData(tmp, conf, hasDashboard)
        return jsonOk('ok')
      }
      case 'POST /create-project': {
        const data = await json<{
          path: unknown
          name: unknown
          author: unknown
        }>()
        if (typeof data.path !== 'string') {
          return jsonError(
            'Bad request.',
            'Project path must be a string',
            400,
          )
        }
        if (
          !/^[a-z0-9-]+$/.test(String(data.name)) ||
          String(data.name).length > 128
        ) {
          return jsonError(
            'Bad request.',
            'Project name must be lowercase, alphanumeric, and may contain hyphens',
            400,
          )
        }
        const path = String(data.path)
        const name = String(data.name)
        const author = String(data.author)
        try {
          const cwd = resolve(path, name)
          mkdirSync(cwd, { recursive: true })
          await init({ cwd, author })
          conf.resetOptions(cwd)
          await install(conf.options)
          conf.resetOptions(conf.options.projectRoot)
          await updateDashboard()
          updateGraphData(tmp, conf, hasDashboard)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err)
          return jsonError('CLI Error', (err as Error).message, 500)
        }
        return jsonOk('ok')
      }
      case `POST /install`: {
        const { add } = await json<{ add?: GUIInstallOptions }>()
        if (!add) {
          return jsonError(
            'Bad request.',
            'GUI install endpoint called without add argument',
            400,
          )
        }
        try {
          await install(...parseInstallOptions(conf, add))
          conf.resetOptions(conf.options.projectRoot)
          updateGraphData(tmp, conf, hasDashboard)
          return jsonOk('ok')
        } catch (err) {
          return jsonError('Install failed', err, 500)
        }
      }
      case `POST /uninstall`: {
        const { remove } = await json<{
          remove?: GUIUninstallOptions
        }>()
        if (!remove) {
          return jsonError(
            'Bad request.',
            'GUI uninstall endpoint called with no arguments',
            400,
          )
        }
        try {
          await uninstall(...parseUninstallOptions(conf, remove))
          conf.resetOptions(conf.options.projectRoot)
          updateGraphData(tmp, conf, hasDashboard)
          return jsonOk('ok')
        } catch (err) {
          return jsonError('Uninstall failed', err, 500)
        }
      }
      /* c8 ignore next 3 */
      default: {
        return staticHandler(req, res)
      }
    }
  })

  return new Promise<Server>(res => {
    const route =
      startingRoute || getDefaultStartingRoute(conf.options)
    server.listen(port, 'localhost', () => {
      stdout(`⚡️ vlt GUI running at http://${HOST}:${port}`)
      void urlOpen(`http://${HOST}:${port}${route}`)
      res(server)
    })
  })
}
