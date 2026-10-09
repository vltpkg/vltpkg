import { error } from '@vltpkg/error-cause'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** commands that support `--global` */
export const globalCommands: ReadonlySet<string> = new Set([
  'install',
  'uninstall',
  'list',
  'query',
  'build',
])

/** folder holding one workspace per global package */
export const globalWorkspacesDir = 'packages'

/** where bins of global packages are linked */
export const globalBinDir = (root: string): string =>
  resolve(root, 'bin')

const validName = /^(?:@[a-z0-9][\w.~-]*\/)?[a-z0-9~][\w.~-]*$/i

/** throws `EUSAGE` unless an unscoped or `@scope/name` pkg name */
export const assertGlobalName = (name: string): void => {
  if (!validName.test(name)) {
    throw error('Invalid package name', {
      code: 'EUSAGE',
      found: name,
    })
  }
}

/** `eslint` -> `eslint-global-ws` */
export const globalWorkspaceName = (name: string): string => {
  assertGlobalName(name)
  return `${name}-global-ws`
}

/** `eslint` -> `packages/eslint-global-ws`, `@s/p` -> `packages/@s+p-global-ws` */
export const globalWorkspacePath = (name: string): string =>
  `${globalWorkspacesDir}/${globalWorkspaceName(name).replace('/', '+')}`

const writeIfMissing = (file: string, data: unknown) => {
  try {
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n', {
      flag: 'wx',
    })
  } catch (er) {
    if ((er as NodeJS.ErrnoException).code !== 'EEXIST') throw er
  }
}

/** create the global project skeleton, keeping existing files */
export const ensureGlobalProject = (root: string): void => {
  mkdirSync(resolve(root, globalWorkspacesDir), { recursive: true })
  writeIfMissing(resolve(root, 'package.json'), {
    name: 'vlt-global',
    private: true,
  })
  writeIfMissing(resolve(root, 'vlt.json'), {
    workspaces: `${globalWorkspacesDir}/*`,
  })
}
