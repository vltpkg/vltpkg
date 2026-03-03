import { homedir } from 'node:os'
import { parse, posix } from 'node:path'

import type { PackageJson } from '@vltpkg/package-json'
import type { Manifest } from '@vltpkg/types'
import type { PathBase, PathScurry } from 'path-scurry'

// In restricted environments (like locked-down Codespaces),
// homedir() might fail. Fall back to parent directory.
let foundHome
try {
  foundHome = posix.format(parse(homedir()))
  /* c8 ignore next 3 */
} catch {}
const home =
  foundHome ?? posix.dirname(posix.format(parse(process.cwd())))

export type ProjectTool =
  | 'vlt'
  | 'node'
  | 'deno'
  | 'bun'
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'js'

const knownTools = new Map<ProjectTool, string[]>([
  [
    'vlt',
    [
      'vlt-lock.json',
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

const inferTools = (
  manifest: Pick<Manifest, 'engines'> & Record<string, unknown>,
  folder: PathBase,
  scurry: PathScurry,
): ProjectTool[] => {
  const tools: ProjectTool[] = []

  for (const knownName of knownTools.keys()) {
    if (
      Object.hasOwn(manifest, knownName) ||
      (manifest.engines && Object.hasOwn(manifest.engines, knownName))
    ) {
      tools.push(knownName)
    }
  }

  for (const [knownName, files] of knownTools) {
    for (const file of files) {
      if (scurry.lstatSync(folder.resolve(file))) {
        tools.push(knownName)
        break
      }
    }
  }

  if (tools.length === 0) {
    tools.push('js')
  }
  return tools
}

export type ProjectData = {
  root: string
  homedirRelativeRoot: string
  tools: ProjectTool[]
  vltInstalled: boolean
}

export const getProjectData = (
  {
    packageJson,
    scurry,
  }: { packageJson: PackageJson; scurry: PathScurry },
  folder: PathBase,
): ProjectData => {
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
