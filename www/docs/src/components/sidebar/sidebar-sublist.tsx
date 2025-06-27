import { ChevronRight } from 'lucide-react'
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

const iconMap: Record<string, () => JSX.Element> = {
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
          {depth === 0 && iconMap[entry.label.toLowerCase()] && (
            <span className="flex h-[24px] w-[24px] items-center justify-center rounded-sm border-[1px] border-border bg-background p-1.5 transition-all duration-200 group-hover:bg-secondary">
              {iconMap[entry.label.toLowerCase()]()}
            </span>
          )}
          <span
            className={
              entry.label === 'commands' ? 'capitalize' : ''
            }>
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
  return (
    <div
      data-name={entry.label.toLowerCase()}
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
          entry.isCurrent ? 'bg-secondary text-foreground' : ''
        }>
        <a href={entry.href} role="link">
          {entry.label}
        </a>
      </Button>
    </div>
  )
}

export default AppSidebarSublist
