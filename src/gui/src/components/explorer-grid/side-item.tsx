import { PackageMinus } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { labelClassNamesMap } from './label-helper.ts'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu.tsx'
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { cn } from '@/lib/utils.ts'
import { Badge } from '@/components/ui/badge.tsx'
import type { MouseEvent } from 'react'
import type { GridItemData, GridItemOptions } from './types.ts'
import type { DependencyTypeShort } from '@vltpkg/types'

export type SideItemOptions = GridItemOptions & {
  parent?: boolean
  onSelect?: () => undefined
  onUninstall?: (item: GridItemData) => void
  isWorkspace?: boolean
}

export const SideItem = ({
  dependencies,
  item,
  highlight,
  onSelect,
  parent,
  isWorkspace,
  onUninstall,
}: SideItemOptions) => {
  const uninstallItem = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (onUninstall) {
      onUninstall(item)
    }
  }

  const uninstallAvailable = !!onUninstall && item.from?.importer

  const connectorStyles = `
    pointer-events-none
    absolute

    w-[var(--column-gap-x)]
    h-[calc(100%+var(--column-gap-y))]

    -top-[calc(100%-1.25px-var(--column-gap-y)/5)]
    -left-[calc(var(--column-gap-x)/2)]

    border-l-[1px]
    border-b-[1px]
    rounded-bl-md
    border-muted

    group-[&:first-of-type]:rounded-none
    group-[&:first-of-type]:h-[1px]
    group-[&:first-of-type]:w-[var(--column-gap-x)]
    group-[&:first-of-type]:-left-4
    group-[&:first-of-type]:border-l-[0px]
    group-[&:first-of-type]:inset-y-0
    group-[&:first-of-type]:my-auto

    group-[&:nth-child(n+3)]:h-[calc(100%+(var(--column-gap-y)*2))]
    group-[&:nth-child(n+3)]:-top-[calc(100%+var(--column-gap-y)/1.5)]

    group-has-[.parent]:left-[calc(100%)]
    group-has-[.parent]:border-l-[0px]
    group-has-[.parent]:w-[var(--column-gap-x)]
    group-has-[.parent]:h-[1px]
    group-has-[.parent]:top-[50%]
    group-has-[.parent]:rounded-none
  `

  const itemName =
    item.depName && item.depName !== item.name ?
      item.depName
    : item.name

  return (
    <div className="group relative">
      <div
        style={
          {
            '--column-gap-y': '1rem',
            '--column-gap-x': '1rem',
          } as React.CSSProperties
        }
        className={cn(
          connectorStyles,
          parent && 'parent',
          !dependencies && !parent && 'hidden',
        )}
      />
      <ContextMenu>
        <ContextMenuTrigger>
          <Card
            role="article"
            className={cn(
              'group relative z-[10] cursor-default transition-all',
              highlight && 'border-muted',
              onSelect && 'hover:border-muted hover:bg-card-accent',
            )}
            onClick={onSelect}>
            <CardHeader className="relative flex w-full max-w-full flex-row items-baseline gap-3 px-3 py-2">
              {!isWorkspace && (
                <SideItemSpec spec={item.spec} itemSize={item.size} />
              )}
              <TooltipProvider>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger className="w-full max-w-full cursor-default items-baseline justify-between overflow-hidden truncate text-left text-sm font-medium">
                    {itemName}
                  </TooltipTrigger>
                  <TooltipContent>{itemName}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {!item.id.startsWith('uninstalled-dep:') && (
                <span className="ml-auto font-courier text-sm font-normal text-muted-foreground">
                  {`v${item.version}`}
                </span>
              )}

              <SideItemBadges labels={item.labels} />
            </CardHeader>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={uninstallItem}
            disabled={!uninstallAvailable}>
            <PackageMinus />
            Remove dependency
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}

const SideItemBadges = ({
  labels,
}: {
  labels: SideItemOptions['item']['labels']
}) => {
  if (!labels) return null
  return (
    <div className="absolute -bottom-3 right-2.5">
      {labels.map((label, idx) => (
        <Badge
          key={`${label}-${idx}`}
          className={cn(
            labelClassNamesMap.get(label as DependencyTypeShort),
            'h-[18px] rounded-full text-xxs font-normal backdrop-blur-md',
          )}>
          {label}
        </Badge>
      ))}
    </div>
  )
}

const SideItemSpec = ({
  spec,
  itemSize,
}: {
  spec: SideItemOptions['item']['spec']
  itemSize: SideItemOptions['item']['size']
}) => {
  if (!spec?.bareSpec) return null

  return (
    <div className="flex items-center gap-2">
      <DataBadge
        variant="mono"
        classNames={{
          wrapperClassName:
            'inline-flex min-w-[10ch] max-w-[20ch] break-all h-[1.375rem]',
          contentClassName: 'truncate pt-0.5',
        }}
        content={
          spec.type === 'registry' && spec.semver ?
            spec.semver
          : spec.bareSpec
        }
      />
      {itemSize > 1 && (
        <span className="text-xs font-medium text-muted-foreground">
          and {itemSize - 1} more.
        </span>
      )}
    </div>
  )
}
