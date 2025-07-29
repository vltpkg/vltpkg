import { error } from '@vltpkg/error-cause'
import type { Manifest } from '@vltpkg/types'
import type { PathBase, PathScurry } from 'path-scurry'

export type ProjectTools =
  | 'vlt'
  | 'node'
  | 'deno'
  | 'bun'
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'js'

const knownTools = new Map<ProjectTools, string[]>([
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

export const isProjectTools = (str: string): str is ProjectTools =>
  knownTools.has(str as ProjectTools)

export const asProjectTools = (str: string): ProjectTools => {
  if (!isProjectTools(str)) {
    throw error('Invalid dashboard tool', {
      found: str,
      validOptions: [...knownTools.keys()],
    })
  }
  return str
}

export const inferTools = (
  manifest: Pick<Manifest, 'engines'> & Record<string, unknown>,
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
