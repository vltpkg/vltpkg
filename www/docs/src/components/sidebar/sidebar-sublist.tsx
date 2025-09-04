import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import {
  majorSections,
  labelMap,
  iconMap,
  Icon,
} from '@/components/sidebar/data.tsx'
import { cn } from '@/lib/utils.ts'

import type {
  SidebarEntries,
  Link,
  Group as GroupType,
} from '@/components/sidebar/sidebar.tsx'

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
        <Row key={index} entry={entry} depth={depth}>
          {renderMenu(entry.entries, depth + 1)}
        </Row>
      )
    }
    return <Row key={index} entry={entry} depth={depth} />
  })
}

const Row = ({
  entry,
  depth,
  children,
}: {
  entry: GroupType | Link
  depth: number
  children?: React.ReactNode
}) => {
  const key = entry.label.toLowerCase()
  const iconName = iconMap[key]
  const showBig = majorSections.has(key)
  const isGroup = entry.type === 'group'
  const isCurrent = !isGroup && (entry as Link).isCurrent

return (
    <div
      data-name={key}
      data-group={isGroup ?? undefined}
      data-link={!isGroup || undefined}
      className={cn(
        isGroup ?
          'group relative flex flex-col'
        : 'peer relative flex h-fit',
        isGroup && depth === 0 && 'mb-1',
      )}
      style={{
        paddingLeft: `${depth * 0.5}rem`,
      }}>
      <Button
        asChild={!isGroup}
        size="sidebar"
        variant="sidebar"
        className={cn(
          'w-full',
          isGroup &&
            'bg-background [&_svg[data-id=chevron]]:has-[+div[data-state=open]]:rotate-90',
          !isGroup && isCurrent && 'bg-secondary text-foreground',
        )}>
        {isGroup ?
          <div className="flex w-full items-center gap-2">
            {iconName ?
              showBig ?
                <span className="flex size-6 items-center justify-center rounded-sm border-[1px] border-border bg-background transition-all duration-200 group-hover:bg-secondary">
                  <Icon name={iconName} className="size-4" />
                </span>
              : <span className="flex size-5 items-center justify-center">
                  <Icon name={iconName} className="size-4" />
                </span>

            : null}
            <span
              className={cn(
                majorSections.has(key) && 'font-semibold',
                entry.label === 'commands' && 'capitalize',
              )}>
              {entry.label === 'api' ?
                'API'
              : (labelMap[key] ?? entry.label)}
            </span>
            <ChevronRight
              data-id="chevron"
              className="pointer-events-none ml-auto transition-transform"
              size={16}
            />
          </div>
        : <a
            href={(entry as Link).href}
            role="link"
            className="flex items-center gap-2">
            {iconName ?
              showBig ?
                <span className="flex size-6 items-center justify-center rounded-sm border-[1px] border-border bg-background transition-all duration-200 hover:bg-secondary">
                  <Icon name={iconName} className="size-4" />
                </span>
              : <span className="flex size-5 items-center justify-center">
                  <Icon name={iconName} className="size-4" />
                </span>

            : null}
            <span
              className={cn(
                majorSections.has(key) && 'font-semibold',
              )}>
              {entry.label}
            </span>
          </a>
        }
      </Button>

      {isGroup ?
        <div
          data-state={
            entry.label === 'commands' ? 'closed'
            : entry.label === 'Packages' ?
              'open'
            : (entry as GroupType).collapsed ?
              'closed'
            : 'open'
          }
          className="mt-2 flex-col gap-1 data-[state=open]:flex data-[state=closed]:hidden">
          {children}
        </div>
      : null}
    </div>
  )
}

export default AppSidebarSublist
