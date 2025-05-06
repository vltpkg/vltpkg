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
      className={`group relative flex flex-col ${depth === 0 ? 'mb-6' : ''}`}
      style={{
        paddingLeft: `${depth * 0.5}rem`,
      }}>
      {depth === 0 && (
        <div className="mb-4 mt-6 px-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {labelMap[entry.label.toLowerCase()]}
          </p>
        </div>
      )}
      <Button
        size="sidebar"
        variant="sidebar"
        className="bg-background [&_svg]:has-[+div[data-state=open]]:rotate-90">
        <span
          className={entry.label === 'commands' ? 'capitalize' : ''}>
          {entry.label}
        </span>
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
