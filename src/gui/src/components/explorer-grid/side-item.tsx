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
  onSelect?: () => void
  onUninstall?: (item: GridItemData) => void
  isWorkspace?: boolean
  selectedItem?: GridItemData
  className?: string
  item: GridItemData & {
    version?: string | undefined
  }
}

export const SideItem = forwardRef<HTMLDivElement, SideItemOptions>(
  (
    {
      item,
      highlight,
      onSelect,
      parent,
      isWorkspace,
      onUninstall,
      selectedItem,
      className,
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

    const itemName =
      item.depName && item.depName !== item.name ?
        item.depName
      : item.name

    return (
      <div
        ref={ref}
        className={cn('group/side-item relative', className)}>
        <ContextMenu>
          <ContextMenuTrigger className="relative w-full">
            <Card
              role="article"
              className={cn(
                'group bg-background relative z-10 flex cursor-pointer flex-col rounded-lg shadow-none transition-colors',
                highlight && 'border-muted',
                onSelect &&
                  'hover:border hover:bg-neutral-100 hover:dark:bg-neutral-900',
              )}
              onClick={onSelect}>
              <CardHeader
                className={cn(
                  'relative flex w-full flex-row items-baseline gap-3 p-1 pr-2',
                  (parent || isWorkspace) && 'px-2',
                )}>
                {!isWorkspace && <SideItemSpec spec={item.spec} />}
                <TooltipProvider>
                  <Tooltip delayDuration={150}>
                    <TooltipTrigger className="w-full cursor-pointer items-baseline justify-between truncate overflow-hidden text-left text-sm font-medium">
                      {itemName}
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent align="start">
                        {itemName}
                      </TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                </TooltipProvider>
                {!item.id.startsWith('uninstalled-dep:') &&
                  item.version && (
                    <TooltipProvider>
                      <Tooltip delayDuration={150}>
                        <TooltipTrigger className="font-courier text-muted-foreground w-full max-w-14 cursor-pointer truncate overflow-hidden text-right text-sm font-normal">
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
              <Card className="bg-secondary/50 mx-auto -mt-px w-[95%] cursor-pointer rounded-none rounded-b-xl border-t-0 px-3 py-1.5 shadow-none dark:bg-neutral-950">
                <div className="flex w-full items-baseline justify-between gap-2">
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger className="grow cursor-pointer truncate overflow-hidden text-left text-xs font-medium">
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
                      <TooltipTrigger className="font-courier text-muted-foreground w-full max-w-24 cursor-pointer truncate overflow-hidden text-right text-xs">
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
              <div className="bg-background absolute inset-x-1 top-[0.2rem] z-9 h-full rounded-lg border transition-colors duration-250 group-hover/side-item:bg-neutral-100/90 group-hover/side-item:dark:bg-neutral-950" />
              {item.size > 2 && (
                <div className="bg-background absolute inset-x-2 top-[0.4rem] z-8 h-full rounded-lg border transition-colors duration-250 group-hover/side-item:bg-neutral-100/80 group-hover/side-item:dark:bg-neutral-950/80" />
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
          <div className="relative flex h-[19px] w-fit cursor-pointer items-center justify-center rounded-full border border-gray-500 bg-gray-200 px-2 dark:border-gray-500 dark:bg-gray-950">
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
            'inline-flex rounded-[calc(0.5rem-0.125rem)] min-w-[10ch] max-w-[20ch] h-[1.375rem]',
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
