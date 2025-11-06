import { forwardRef } from 'react'
import { PackageMinus } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
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
  TooltipPortal,
} from '@/components/ui/tooltip.tsx'
import { cn } from '@/lib/utils.ts'
import { RelationBadge } from '@/components/ui/relation-badge.tsx'

import type { MouseEvent } from 'react'
import type { GridItemData, GridItemOptions } from './types.ts'

export type SideItemOptions = GridItemOptions & {
  parent?: boolean
  onSelect?: (e: React.MouseEvent) => void
  onUninstall?: (item: GridItemData) => void
  isWorkspace?: boolean
  selectedItem?: GridItemData
}

export const SideItem = forwardRef<HTMLDivElement, SideItemOptions>(
  (
    {
      dependencies,
      item,
      highlight,
      onSelect,
      parent,
      isWorkspace,
      onUninstall,
      selectedItem,
    },
    ref,
  ) => {
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
    group-has-[.parent]:top-[25%]
    group-has-[.parent]:rounded-none
  `

    const itemName =
      item.depName && item.depName !== item.name ?
        item.depName
      : item.name

    return (
      <div ref={ref} className="group relative">
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
          <ContextMenuTrigger className="group/side-item relative">
            <Card
              role="article"
              className={cn(
                'group relative z-[10] flex cursor-default flex-col rounded-xl shadow-none transition-colors',
                highlight && 'border-muted',
                onSelect && 'hover:border-muted hover:bg-card-accent',
              )}
              onClick={onSelect}>
              <CardHeader
                className={cn(
                  'relative flex w-full flex-row items-baseline gap-3 px-2 py-2',
                  parent && 'px-3',
                )}>
                {!isWorkspace && <SideItemSpec spec={item.spec} />}
                <TooltipProvider>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger className="w-full cursor-default items-baseline justify-between truncate overflow-hidden text-left text-sm font-medium">
                      {itemName}
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent align="start">
                        {itemName}
                      </TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                </TooltipProvider>
                {!item.id.startsWith('uninstalled-dep:') && (
                  <TooltipProvider>
                    <Tooltip delayDuration={150}>
                      <TooltipTrigger className="font-courier text-muted-foreground w-full max-w-14 cursor-default truncate overflow-hidden text-right text-sm font-normal">
                        {`v${item.version}`}
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent align="start">
                          {`v${item.version}`}
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <SideItemBadges
                  labels={item.labels}
                  itemSize={item.size}
                />
              </CardHeader>
            </Card>

            {parent && (
              <Card className="bg-secondary/50 mx-auto -mt-[1px] w-[95%] cursor-default rounded-none rounded-b-xl border-t-[0px] px-3 py-1.5 shadow-none dark:bg-neutral-950">
                <div className="flex w-full items-baseline justify-between gap-2">
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger className="grow cursor-default truncate overflow-hidden text-left text-xs font-medium">
                        {selectedItem?.name}
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent align="start">
                          {selectedItem?.name}
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger className="font-courier text-muted-foreground w-full max-w-24 cursor-default truncate overflow-hidden text-right text-xs">
                        {selectedItem?.spec?.bareSpec}
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent align="end">
                          {selectedItem?.spec?.bareSpec}
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </Card>
            )}
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={uninstallItem}
              disabled={!uninstallAvailable}>
              <PackageMinus />
              Remove dependency
            </ContextMenuItem>
          </ContextMenuContent>
          {item.stacked && (
            <>
              <div className="bg-card group-hover/side-item:border-muted group-hover/side-item:bg-card-accent/50 absolute inset-x-1 top-[0.2rem] z-[9] h-full rounded-lg border-[1px] transition-colors duration-250" />
              {item.size > 2 && (
                <div className="bg-card group-hover/side-item:border-muted group-hover/side-item:bg-card-accent/30 absolute inset-x-2 top-[0.4rem] z-[8] h-full rounded-lg border-[1px] transition-colors duration-250" />
              )}
            </>
          )}
        </ContextMenu>
      </div>
    )
  },
)

const SideItemBadges = ({
  labels,
  itemSize,
}: {
  labels: SideItemOptions['item']['labels']
  itemSize: SideItemOptions['item']['size']
}) => {
  if (!labels && (itemSize === 0 || !itemSize)) return null

  return (
    <div className="absolute inset-x-0 -bottom-3 px-2.5">
      <div className="relative flex w-full items-center justify-end">
        {itemSize > 1 && (
          <div className="relative flex h-[19px] w-fit cursor-default items-center justify-center rounded-full border-[1px] border-gray-500 bg-gray-200 px-2 dark:border-gray-500 dark:bg-gray-950">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {itemSize - 1} more
            </span>
          </div>
        )}

        {labels && labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {labels.map((label, idx) => (
              <RelationBadge key={`${label}-${idx}`} relation={label}>
                {label}
              </RelationBadge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SideItemSpec = ({
  spec,
}: {
  spec: SideItemOptions['item']['spec']
}) => {
  if (!spec?.bareSpec) return null

  return (
    <div className="flex items-center gap-2">
      <DataBadge
        variant="mono"
        classNames={{
          wrapperClassName:
            'inline-flex min-w-[10ch] max-w-[20ch] h-[1.375rem]',
          contentClassName: 'overflow-hidden truncate pt-0.5',
        }}
        content={
          spec.type === 'registry' && spec.semver ?
            spec.semver
          : spec.bareSpec
        }
      />
    </div>
  )
}
