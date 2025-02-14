import { homedir } from 'node:os'
import { type PathBase, type PathScurry } from 'path-scurry'
import { type LoadedConfig } from './types.ts'
import { type Manifest } from '@vltpkg/types'

export type ProjectTools =
  | 'vlt'
  | 'node'
  | 'deno'
  | 'bun'
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'js'

export type DashboardProjectData = {
  name: string
  readablePath: string
  path: string
  manifest: Manifest
  tools: ProjectTools[]
  mtime?: number
}

export type GraphProjectData = {
  tools: ProjectTools[]
  vltInstalled: boolean
}

const knownTools = new Map<ProjectTools, string[]>([
  [
    'vlt',
    [
      'vlt-lock.json',
      'vlt-workspaces.json',
      'vlt.json',
      'node_modules/.vlt',
      'node_modules/.vlt-lock.json',
    ],
  ],
  ['node', []],
  ['deno', ['deno.json']],
  ['bun', ['bun.lockb', 'bunfig.toml']],
  ['npm', ['package-lock.json', 'node_modules/.package-lock.json']],
  [
    'pnpm',
    ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'node_modules/.pnpm'],
  ],
  ['yarn', ['yarn.lock']],
])

export const isProjectTools = (str: string): str is ProjectTools =>
  knownTools.has(str as ProjectTools)

export const asProjectTools = (str: string): ProjectTools => {
  if (!isProjectTools(str)) {
    throw new Error(`Invalid dashboard tool: ${str}`)
  }
  return str
}

export const inferTools = (
  manifest: Manifest,
  folder: PathBase,
  scurry: PathScurry,
) => {
  const tools: ProjectTools[] = []
  // check if known tools names are found in the manifest file
  for (const knownName of knownTools.keys()) {
    if (
      Object.hasOwn(manifest, knownName) ||
      (manifest.engines && Object.hasOwn(manifest.engines, knownName))
    ) {
      tools.push(asProjectTools(knownName))
    }
  }

  // check for known file names
  for (const [knownName, files] of knownTools) {
    for (const file of files) {
      if (scurry.lstatSync(folder.resolve(file))) {
        tools.push(asProjectTools(knownName))
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

export const getDashboardProjectData = (
  folder: PathBase,
  conf: LoadedConfig,
): DashboardProjectData | undefined => {
  const { packageJson, scurry } = conf.options
  let manifest
  try {
    manifest = packageJson.read(folder.fullpath())
  } catch {
    return
  }
  const path = folder.fullpath()
  return {
    name: manifest.name || folder.name,
    readablePath: getReadablePath(path),
    path,
    manifest,
    tools: inferTools(manifest, folder, scurry),
    mtime: folder.lstatSync()?.mtimeMs,
  }
}

export const getGraphProjectData = (
  conf: LoadedConfig,
  folder?: PathBase,
) => {
  if (!folder) {
    return {
      tools: [],
      vltInstalled: false,
    }
  }

  const { packageJson, scurry } = conf.options
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
