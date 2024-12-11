import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { type Server, createServer } from 'node:http'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import {
  type Dependency,
  type DependencyTypeShort,
  actual,
  asDependency,
} from '@vltpkg/graph'
import handler from 'serve-handler'
import opener from 'opener'
import { loadPackageJson } from 'package-json-from-dist'
import { type PathScurry, type PathBase } from 'path-scurry'
import { readProjectFolders } from './read-project-folders.js'
import { type DepID, asDepID } from '@vltpkg/dep-id'
import { type Manifest } from '@vltpkg/types'
import {
  type ConfigOptions,
  type LoadedConfig,
} from './config/index.js'
import { stderr, stdout } from './output.js'
import { type InstallOptions, install } from './install.js'
import { Spec } from '@vltpkg/spec'

const HOST = 'localhost'
const PORT = 7017

const { version } = loadPackageJson(import.meta.filename) as {
  version: string
}

export type GUIInstallOptions = Record<
  string,
  Record<string, { version: string; type: DependencyTypeShort }>
>

export type StartGUIOptions = {
  assetsDir: string
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

export type DashboardData = {
  cwd: string
  buildVersion: string
  projects: DashboardDataProject[]
}

export type DashboardDataProject = {
  name: string
  path: string
  manifest: Manifest
  tools: DashboardTools[]
  mtime?: number
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
  const addArgs = new Map<DepID, Map<string, Dependency>>()
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
    }
    addArgs.set(asDepID(importerId), depMap)
  }
  return { add: addArgs, conf }
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

export const formatDashboardJson = (
  projectFolders: PathBase[],
  options: ConfigOptions,
) => {
  const result: DashboardData = {
    cwd: process.cwd(),
    buildVersion: version,
    projects: [],
  }
  for (const folder of projectFolders) {
    let manifest
    try {
      manifest = options.packageJson.read(folder.fullpath())
    } catch (_err) {
      continue
    }
    result.projects.push({
      /* c8 ignore next */
      name: manifest.name || folder.name,
      path: folder.fullpath(),
      manifest,
      tools: inferTools(manifest, folder, options.scurry),
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
  options: ConfigOptions,
) => {
  const dashboard = formatDashboardJson(
    readProjectFolders(process.cwd(), options),
    options,
  )
  const dashboardJson = JSON.stringify(dashboard, null, 2)
  writeFileSync(resolve(tmp, 'dashboard.json'), dashboardJson)
  return dashboard.projects.length > 0
}

export const startGUI = async ({
  assetsDir,
  conf,
  port = PORT,
  startingRoute = '/dashboard',
  tmpDir = tmpdir(),
}: StartGUIOptions) => {
  const { options } = conf
  const tmp = resolve(tmpDir, 'vltgui')
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  for (const file of readdirSync(assetsDir)) {
    cpSync(resolve(assetsDir, file), resolve(tmp, file), {
      recursive: true,
    })
  }

  // dashboard data is optional since the GUI might be started from a
  // project in order to just explore its graph data
  let hasDashboard = false
  try {
    hasDashboard = await updateDashboardData(tmp, options)
    /* c8 ignore next */
  } catch (_err) {}
  if (!hasDashboard) {
    rmSync(resolve(tmp, 'dashboard.json'), { force: true })
  }

  // reading graph data is optional since the command might be run from a
  // parend directory of any given project root, in which case the GUI is
  // going to render only the dashboard to start with
  try {
    updateGraphData(tmp, conf, hasDashboard)
  } catch (_err) {
    rmSync(resolve(tmp, 'graph.json'), { force: true })
  }

  const opts = {
    cleanUrls: true,
    public: tmp,
    rewrites: [
      { source: '/', destination: '/index.html' },
      { source: '/error', destination: '/index.html' },
      { source: '/explore', destination: '/index.html' },
      { source: '/dashboard', destination: '/index.html' },
    ],
  }
  const server = createServer((req, res): void => {
    if (req.url === '/select-project') {
      req.setEncoding('utf8')
      let json = ''
      req.on('data', (d: string) => {
        json += d
      })
      req.on('end', () => {
        const data = JSON.parse(json) as { path: unknown }
        conf.resetOptions(String(data.path))
        updateGraphData(tmp, conf, hasDashboard)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify('ok'))
      })
    } else if (req.url === '/install') {
      req.setEncoding('utf8')
      let json = ''
      req.on('data', (d: string) => {
        json += d
      })
      req.on('end', () => {
        const { add } = JSON.parse(json) as {
          add?: GUIInstallOptions
        }
        if (!add) {
          stderr('GUI install endpoint called without add argument')
          res.statusCode = 400
          res.end('Bad request')
          return
        }
        install(parseInstallOptions(conf, add))
          .then(() => {
            conf.resetOptions(conf.options.projectRoot)
            updateGraphData(tmp, conf, hasDashboard)
            res.writeHead(200, {
              'Content-Type': 'application/json',
            })
            res.end(JSON.stringify('ok'))
          })
          .catch((err: unknown) => {
            stderr(err)
            res.statusCode = 400
            res.end(`Install failed.\n${String(err)}`)
          })
      })
      /* c8 ignore start */
    } else {
      handler(req, res, opts).catch((err: unknown) => {
        stderr(err)
        res.statusCode = 500
        res.end('Internal server error')
      })
    }
    /* c8 ignore stop */
  })

  return new Promise<Server>(res => {
    server.listen(port, 'localhost', () => {
      stdout(`⚡️ vlt GUI running at http://${HOST}:${port}`)
      opener(`http://${HOST}:${port}${startingRoute}`)
      res(server)
    })
  })
}
