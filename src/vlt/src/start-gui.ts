import { asDepID } from '@vltpkg/dep-id'
import {
  actual,
  asDependency,
  type AddImportersDependenciesMap,
  type Dependency,
  type RemoveImportersDependenciesMap,
} from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'
import {
  type Manifest,
  type DependencyTypeShort,
} from '@vltpkg/types'
import { urlOpen } from '@vltpkg/url-open'
import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {
  createServer,
  type IncomingMessage,
  request,
  type ServerResponse,
  type Server,
} from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { dirname, resolve, relative } from 'node:path'
import { loadPackageJson } from 'package-json-from-dist'
import { type PathBase, type PathScurry } from 'path-scurry'
import handler from 'serve-handler'
import {
  type ConfigOptions,
  type LoadedConfig,
} from './config/index.ts'
import { install, type InstallOptions } from './install.ts'
import { stderr, stdout } from './output.ts'
import { readProjectFolders } from './read-project-folders.ts'
import { uninstall, type UninstallOptions } from './uninstall.ts'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert'

const HOST = 'localhost'
const PORT = 7017

const { version } = loadPackageJson(import.meta.filename) as {
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

export type DashboardTools =
  | 'vlt'
  | 'node'
  | 'deno'
  | 'bun'
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'js'

export type DashboardLocation = {
  path: string
  readablePath: string
}

export type DashboardData = {
  cwd: string
  buildVersion: string
  dashboardProjectLocations: DashboardLocation[]
  projects: DashboardDataProject[]
}

export type DashboardDataProject = {
  name: string
  readablePath: string
  path: string
  manifest: Manifest
  tools: DashboardTools[]
  mtime?: number
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

const knownTools = new Map<DashboardTools, string[]>([
  ['vlt', ['vlt-lock.json', 'vlt-workspaces.json']],
  ['node', []],
  ['deno', ['deno.json']],
  ['bun', ['bun.lockb', 'bunfig.toml']],
  ['npm', ['package-lock.json']],
  ['pnpm', ['pnpm-lock.yaml', 'pnpm-workspace.yaml']],
  ['yarn', ['yarn.lock']],
])

const isDashboardTools = (str: string): str is DashboardTools =>
  knownTools.has(str as DashboardTools)

const asDashboardTools = (str: string): DashboardTools => {
  /* c8 ignore start */
  if (!isDashboardTools(str)) {
    throw new Error(`Invalid dashboard tool: ${str}`)
  }
  /* c8 ignore stop */
  return str
}

export const parseInstallOptions = (
  conf: LoadedConfig,
  args: GUIInstallOptions,
): InstallOptions => {
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
  return { add: addArgs, conf }
}

export const parseUninstallOptions = (
  conf: LoadedConfig,
  args: GUIUninstallOptions,
): UninstallOptions => {
  const removeArgs = new RemoveImportersDependenciesMapImpl()
  for (const [importerId, deps] of Object.entries(args)) {
    const depMap = new Set<string>()
    for (const name of deps) {
      depMap.add(name)
    }
    removeArgs.set(asDepID(importerId), depMap)
    removeArgs.modifiedDependencies = true
  }
  return { remove: removeArgs, conf }
}

export const inferTools = (
  manifest: Manifest,
  folder: PathBase,
  scurry: PathScurry,
) => {
  const tools: DashboardTools[] = []
  // check if known tools names are found in the manifest file
  for (const knownName of knownTools.keys()) {
    if (
      Object.hasOwn(manifest, knownName) ||
      (manifest.engines && Object.hasOwn(manifest.engines, knownName))
    ) {
      tools.push(asDashboardTools(knownName))
    }
  }

  for (const [knownName, files] of knownTools) {
    for (const file of files) {
      if (scurry.lstatSync(folder.resolve(file))) {
        tools.push(asDashboardTools(knownName))
        break
      }
    }
  }

  // defaults to js if no tools are found
  if (tools.length === 0) {
    tools.push('js')
  }
  return tools
}

export const getReadablePath = (path: string) =>
  path.replace(homedir(), '~')

export const formatDashboardJson = (
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
    projects: [],
  }
  for (const folder of projectFolders) {
    let manifest
    try {
      manifest = conf.options.packageJson.read(folder.fullpath())
    } catch {
      continue
    }
    const path = folder.fullpath()
    result.projects.push({
      /* c8 ignore next */
      name: manifest.name || folder.name,
      readablePath: getReadablePath(path),
      path,
      manifest,
      tools: inferTools(manifest, folder, conf.options.scurry),
      mtime: folder.lstatSync()?.mtimeMs,
    })
  }
  return result
}

const updateGraphData = (
  tmp: string,
  conf: LoadedConfig,
  hasDashboard: boolean,
) => {
  const { options } = conf
  const monorepo = options.monorepo
  const mainManifest = options.packageJson.read(options.projectRoot)
  const graph = actual.load({
    ...options,
    mainManifest,
    monorepo,
    loadManifests: true,
  })
  const importers = [...graph.importers]
  const graphJson = JSON.stringify(
    {
      hasDashboard,
      importers,
      lockfile: graph,
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
  const dashboard = formatDashboardJson(
    readProjectFolders({
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
  if (process.env._VLT_DEV_LIVE_RELOAD) {
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
  // workaround for the import.meta.resolve issue not working with tap
  if (process.env.TAP) {
    assert(
      process.env.VLT_TEST_GUI_DIR,
      'VLT_TEST_GUI_DIR must be set when running tests',
    )
    return process.env.VLT_TEST_GUI_DIR
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
  cpSync(assetsDir, tmp, { recursive: true })

  // dashboard data is optional since the GUI might be started from a
  // project in order to just explore its graph data
  let hasDashboard = false
  try {
    hasDashboard = await updateDashboardData(tmp, conf)
    /* c8 ignore next */
  } catch {}
  if (!hasDashboard) {
    rmSync(resolve(tmp, 'dashboard.json'), { force: true })
  }

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
        updateGraphData(tmp, conf, hasDashboard)
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
          await install(parseInstallOptions(conf, add))
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
          await uninstall(parseUninstallOptions(conf, remove))
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
