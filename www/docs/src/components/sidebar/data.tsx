import * as LucideIcons from 'lucide-react'
import * as VltIcons from '@/components/icons/icons.ts'

import type { ElementType } from 'react'
import type { LucideProps } from 'lucide-react'

export const labelMap: Record<string, string> = {
  packages: 'Internals',
  cli: 'Client',
}

export const majorSections = new Set([
  'registry',
  'client',
  'packages',
])

const allIcons = {
  ...LucideIcons,
  // override any lucide icons with our custom ones
  ...VltIcons,
}

export type IconName = keyof typeof allIcons

export const iconMap: Partial<Record<string, IconName>> = {
  overview: 'Home',
  registry: 'Vsr',
  client: 'Client',
  packages: 'Package',
  internals: 'Package',
  api: 'Code',
  comparisons: 'BarChart3',
  configuring: 'Config',
  deployment: 'Rocket',
  features: 'Star',
  'getting started': 'BookOpen',
  commands: 'Command',
  authentication: 'Authentication',
  auth: 'Authentication',
  'query selectors': 'Query',
  catalogs: 'Database',
  registries: 'Globe',
  selectors: 'Search',
  security: 'Shield',
  workspaces: 'Folder',
  'graph modifiers': 'GitBranch',
  cache: 'Cache',
  config: 'Config',
  'exec-cache': 'Activity',
  'exec-local': 'Monitor',
  exec: 'Play',
  serve: 'Vlt',
  help: 'HelpCircle',
  init: 'Plus',
  install: 'Download',
  list: 'FileText',
  login: 'Lock',
  logout: 'Unlock',
  pack: 'Archive',
  pkg: 'Package',
  publish: 'Upload',
  query: 'Query',
  run: 'Play',
  'run-exec': 'Play',
  token: 'Authentication',
  uninstall: 'Trash2',
  version: 'Tag',
  whoami: 'Users',
  'cache-unzip': 'Archive',
  'cli-sdk': 'Terminal',
  'cmd-shim': 'Link',
  'dep-id': 'Hash',
  'dot-prop': 'MapPin',
  'dss-breadcrumb': 'Compass',
  'dss-parser': 'Code',
  'error-cause': 'AlertCircle',
  'fast-split': 'FastSplit',
  git: 'GitBranch',
  'git-scp-url': 'Link',
  graph: 'Network',
  keychain: 'Authentication',
  output: 'Monitor',
  'package-info': 'Info',
  'package-json': 'PackageJson',
  'pick-manifest': 'Filter',
  'promise-spawn': 'Play',
  'registry-client': 'Globe',
  'rollback-remove': 'RotateCcw',
  satisfies: 'CheckCircle',
  'security-archive': 'Shield',
  semver: 'Tag',
  server: 'Server',
  spec: 'FileText',
  tar: 'Archive',
  types: 'Code',
  'url-open': 'ExternalLink',
  'vlt-json': 'FileText',
  vlx: 'Zap',
  which: 'Search',
  xdg: 'Xdg',
  reference: 'BookOpen',
  module_index: 'Layers',
  browser: 'Globe',
  definition: 'FileText',
  view: 'Eye',
  unzip: 'Archive',
  error: 'AlertCircle',
  'cache-entry': 'Database',
  dashboard: 'Monitor',
  'project-tools': 'Wrench',
  pool: 'Layers',
  'unpack-request': 'Download',
  unpack: 'Archive',
}

export const Icon = ({
  name,
  ...props
}: { name: IconName } & LucideProps) => {
  const Comp = allIcons[name] as ElementType<LucideProps>
  return <Comp {...props} />
}
