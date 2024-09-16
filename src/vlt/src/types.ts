import type { PackageJson } from '@vltpkg/package-json'
import type { Monorepo } from '@vltpkg/workspaces'
import type { PathScurry } from 'path-scurry'

export type CliCommandOptions = {
  monorepo?: Monorepo
  packageJson?: PackageJson
  scurry?: PathScurry
}
