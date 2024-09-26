import type { PackageJson } from '@vltpkg/package-json'
import type { Monorepo } from '@vltpkg/workspaces'
import type { PathScurry } from 'path-scurry'
import type { LoadedConfig } from './config/index.js'

export type * from './config/index.js'

export type CliCommandOptions = {
  monorepo?: Monorepo
  packageJson?: PackageJson
  scurry?: PathScurry
}

export type CliCommand = {
  command: (
    conf: LoadedConfig,
    options: CliCommandOptions,
  ) => Promise<void>
  usage: string | (() => Promise<string>)
}
