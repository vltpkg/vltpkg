import {
  ChevronRight,
  Package,
  Zap,
  Globe,
  Settings,
  Rocket,
  Star,
  BookOpen,
  Code,
  BarChart3,
  Terminal,
  Key,
  Database,
  Shield,
  Users,
  FileText,
  GitBranch,
  Search,
  Download,
  Upload,
  Server,
  Lock,
  Unlock,
  Activity,
  Layers,
  Network,
  Archive,
  Hash,
  Filter,
  Link as LinkIcon,
  Wrench,
  Eye,
  CheckCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Play,
  RotateCcw,
  Trash2,
  Plus,
  Tag,
  ExternalLink,
  Monitor,
  MapPin,
  Folder,
  Compass,
} from 'lucide-react'
import type {
  SidebarEntries,
  Link,
  Group as GroupType,
} from '@/components/sidebar/sidebar.jsx'
import { Button } from '@/components/ui/button.tsx'

const AppSidebarSublist = ({
  sidebar,
}: {
  sidebar: SidebarEntries
  className?: string
}) => {
  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto">
      {renderMenu(sidebar, 0)}
    </div>
  )
}

const renderMenu = (entries: SidebarEntries, depth: number) => {
  return entries.map((entry, index) => {
    if (entry.type === 'group') {
      return (
        <Group key={index} entry={entry} depth={depth}>
          {renderMenu(entry.entries, depth + 1)}
        </Group>
      )
    }
    return <Item key={index} entry={entry} depth={depth} />
  })
}

const labelMap: Record<string, string> = {
  packages: 'Internals',
  cli: 'Client',
}

// Define major sections that should have borders and bold text
const majorSections = new Set([
  'documentation',
  'registry',
  'api',
  'client',
  'commands',
  'internals',
  'packages',
])

const iconMap: Record<string, () => React.JSX.Element> = {
  // Keep existing custom icons for main sections
  registry: () => (
    <img
      src="/icons/vsr.svg"
      className="size-5 dark:invert dark:filter"
      alt="Registry"
    />
  ),
  client: () => (
    <img
      src="/icons/client.svg"
      className="size-5 dark:invert dark:filter"
      alt="Client"
    />
  ),
  packages: () => <Package className="size-4" />,
  internals: () => <Package className="size-4" />,

  // Registry subsections
  api: () => <Code className="size-4" />,
  comparisons: () => <BarChart3 className="size-4" />,
  configuring: () => <Settings className="size-4" />,
  deployment: () => <Rocket className="size-4" />,
  features: () => <Star className="size-4" />,
  'getting-started': () => <BookOpen className="size-4" />,
  'getting started': () => <BookOpen className="size-4" />,

  // Client/CLI subsections
  commands: () => <Terminal className="size-4" />,
  auth: () => <Key className="size-4" />,
  catalogs: () => <Database className="size-4" />,
  registries: () => <Globe className="size-4" />,
  selectors: () => <Search className="size-4" />,
  workspaces: () => <Folder className="size-4" />,
  'graph-modifiers': () => <GitBranch className="size-4" />,
  'graph modifiers': () => <GitBranch className="size-4" />,

  // Individual commands
  cache: () => <Database className="size-4" />,
  config: () => <Settings className="size-4" />,
  'exec-cache': () => <Activity className="size-4" />,
  'exec-local': () => <Monitor className="size-4" />,
  exec: () => <Play className="size-4" />,
  gui: () => <Monitor className="size-4" />,
  help: () => <HelpCircle className="size-4" />,
  init: () => <Plus className="size-4" />,
  install: () => <Download className="size-4" />,
  list: () => <FileText className="size-4" />,
  login: () => <Lock className="size-4" />,
  logout: () => <Unlock className="size-4" />,
  pack: () => <Archive className="size-4" />,
  pkg: () => <Package className="size-4" />,
  publish: () => <Upload className="size-4" />,
  query: () => <Search className="size-4" />,
  'run-exec': () => <Play className="size-4" />,
  run: () => <Play className="size-4" />,
  token: () => <Key className="size-4" />,
  uninstall: () => <Trash2 className="size-4" />,
  version: () => <Tag className="size-4" />,
  whoami: () => <Users className="size-4" />,

  // Package-specific icons
  'cache-unzip': () => <Archive className="size-4" />,
  'cli-sdk': () => <Terminal className="size-4" />,
  'cmd-shim': () => <LinkIcon className="size-4" />,
  'dep-id': () => <Hash className="size-4" />,
  'dot-prop': () => <MapPin className="size-4" />,
  'dss-breadcrumb': () => <Compass className="size-4" />,
  'dss-parser': () => <Code className="size-4" />,
  'error-cause': () => <AlertCircle className="size-4" />,
  'fast-split': () => <Zap className="size-4" />,
  git: () => <GitBranch className="size-4" />,
  'git-scp-url': () => <LinkIcon className="size-4" />,
  graph: () => <Network className="size-4" />,
  keychain: () => <Key className="size-4" />,
  output: () => <Monitor className="size-4" />,
  'package-info': () => <Info className="size-4" />,
  'package-json': () => <FileText className="size-4" />,
  'pick-manifest': () => <Filter className="size-4" />,
  'promise-spawn': () => <Play className="size-4" />,
  'registry-client': () => <Globe className="size-4" />,
  'rollback-remove': () => <RotateCcw className="size-4" />,
  satisfies: () => <CheckCircle className="size-4" />,
  'security-archive': () => <Shield className="size-4" />,
  semver: () => <Tag className="size-4" />,
  server: () => <Server className="size-4" />,
  spec: () => <FileText className="size-4" />,
  tar: () => <Archive className="size-4" />,
  types: () => <Code className="size-4" />,
  'url-open': () => <ExternalLink className="size-4" />,
  'vlt-json': () => <FileText className="size-4" />,
  vlx: () => <Zap className="size-4" />,
  which: () => <Search className="size-4" />,
  xdg: () => <Folder className="size-4" />,

  // Reference and module pages
  reference: () => <BookOpen className="size-4" />,
  module_index: () => <Layers className="size-4" />,
  browser: () => <Globe className="size-4" />,
  definition: () => <FileText className="size-4" />,
  view: () => <Eye className="size-4" />,
  unzip: () => <Archive className="size-4" />,
  error: () => <AlertCircle className="size-4" />,
  'cache-entry': () => <Database className="size-4" />,
  dashboard: () => <Monitor className="size-4" />,
  'project-tools': () => <Wrench className="size-4" />,
  pool: () => <Layers className="size-4" />,
  'unpack-request': () => <Download className="size-4" />,
  unpack: () => <Archive className="size-4" />,
}

const Group = ({
  entry,
  children,
  depth,
}: {
  entry: GroupType
  children: React.ReactNode
  depth: number
}) => {
  return (
    <div
      data-name={entry.label.toLowerCase()}
      data-group
      className={`group relative flex flex-col ${depth === 0 ? 'mb-1' : ''}`}
      style={{
        paddingLeft: `${depth * 0.5}rem`,
      }}>
      <Button
        size="sidebar"
        variant="sidebar"
        className="bg-background [&_svg]:has-[+div[data-state=open]]:rotate-90">
        <div className="flex items-center gap-2">
          {entry.label.toLowerCase() in iconMap ?
            majorSections.has(entry.label.toLowerCase()) ?
              <span className="flex h-[24px] w-[24px] items-center justify-center rounded-sm border-[1px] border-border bg-background p-1.5 transition-all duration-200 group-hover:bg-secondary">
                {iconMap[entry.label.toLowerCase()]()}
              </span>
            : <span className="flex h-[20px] w-[20px] items-center justify-center">
                {iconMap[entry.label.toLowerCase()]()}
              </span>

          : null}
          <span
            className={`${
              majorSections.has(entry.label.toLowerCase()) ?
                'font-semibold'
              : ''
            } ${entry.label === 'commands' ? 'capitalize' : ''}`}>
            {entry.label === 'api' ?
              'API'
            : labelMap[entry.label.toLowerCase()] || entry.label}
          </span>
        </div>
        <ChevronRight
          className="ml-auto transition-transform"
          size={16}
        />
      </Button>

      <div
        data-state={
          entry.label === 'commands' ? 'closed'
          : entry.label === 'Packages' ?
            'open'
          : entry.collapsed ?
            'closed'
          : 'open'
        }
        className="mt-2 flex-col gap-1 data-[state=open]:flex data-[state=closed]:hidden">
        {children}
      </div>
    </div>
  )
}

const Item = ({ entry, depth }: { entry: Link; depth: number }) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const hasIcon = (entry as any).label.toLowerCase() in iconMap

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
  return (
    <div
      data-name={(entry as any).label.toLowerCase()}
      data-link={true}
      className="peer relative flex h-fit"
      style={{
        paddingLeft: `${depth * 0.5}rem`,
      }}>
      <Button
        asChild
        size="sidebar"
        variant="sidebar"
        className={
          (entry as any).isCurrent ?
            'bg-secondary text-foreground'
          : ''
        }>
        {}
        <a
          href={(entry as any).href}
          role="link"
          className="flex items-center gap-2">
          {hasIcon &&
            (majorSections.has((entry as any).label.toLowerCase()) ?
              <span className="flex h-[24px] w-[24px] items-center justify-center rounded-sm border-[1px] border-border bg-background p-1.5 transition-all duration-200 hover:bg-secondary">
                {}
                {iconMap[(entry as any).label.toLowerCase()]()}
              </span>
            : <span className="flex h-[20px] w-[20px] items-center justify-center">
                {}
                {iconMap[(entry as any).label.toLowerCase()]()}
              </span>)}
          {}
          <span
            className={
              majorSections.has((entry as any).label.toLowerCase()) ?
                'font-semibold'
              : ''
            }>
            {}
            {(entry as any).label}
          </span>
        </a>
      </Button>
    </div>
  )
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
}

export default AppSidebarSublist
