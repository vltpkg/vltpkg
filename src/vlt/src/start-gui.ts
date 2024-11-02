import {
  cpSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { Server, createServer } from 'node:http'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { actual } from '@vltpkg/graph'
import handler from 'serve-handler'
import opener from 'opener'
import { PathScurry, PathBase } from 'path-scurry'
import { readProjectFolders } from './read-project-folders.js'
import type { Manifest } from '@vltpkg/types'
import type { ConfigOptions, LoadedConfig } from './config/index.js'

const HOST = 'localhost'
const PORT = 7017

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
  ['bun', ['bunfig.toml']],
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
  const result: DashboardData[] = []
  for (const folder of projectFolders) {
    let manifest
    try {
      manifest = options.packageJson.read(folder.fullpath())
    } catch (_err) {
      continue
    }
    result.push({
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
  return dashboard.length > 0
}

export const startGUI = async ({
  assetsDir,
  conf,
  startingRoute = '/dashboard',
  port = PORT,
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
      // TODO: clean this up, use stream helpers, make it cute
      req.setEncoding('utf8')
      let json = ''
      req.on('data', (d: string) => {
        json += d
      })
      req.on('end', () => {
        const data = JSON.parse(json)
        conf.resetOptions(String(data.path))
        updateGraphData(tmp, conf, hasDashboard)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify('ok'))
      })
      /* c8 ignore start */
    } else {
      handler(req, res, opts).catch((err: unknown) => {
        console.error(err)
        res.statusCode = 500
        res.end('Internal server error')
      })
    }
    /* c8 ignore stop */
  })

  return await new Promise<Server>(res => {
    server.listen(port, 'localhost', () => {
      console.log(`⚡️ vlt GUI running at http://${HOST}:${port}`)
      opener(`http://${HOST}:${port}${startingRoute}`)
      res(server)
    })
  })
}
