import { useRef, useEffect } from 'react'
import type { MouseEvent } from 'react'
import { Ellipsis, PackageMinus } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'
import { Card, CardHeader } from '@/components/ui/card.tsx'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { labelClassNamesMap } from './label-helper.ts'
import type { GridItemData, GridItemOptions } from './types.ts'
import { useGraphStore } from '@/state/index.ts'

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
  parent,
  onSelect,
  isWorkspace,
  onUninstall,
}: SideItemOptions) => {
  // These refs and the code in useEffect are used to fix the line connection
  // height for when the first dependency item title takes up more space than
  // a single line, which should be a very rare occasion
  const divRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const linePositionReference = useGraphStore(
    state => state.linePositionReference,
  )
  useEffect(() => {
    const rect = lineRef.current?.getBoundingClientRect()
    if (rect && lineRef.current) {
      const height = rect.bottom - linePositionReference
      lineRef.current.style.height = `${height}px`
    }
    if (item.depIndex && divRef.current) {
      divRef.current.style.zIndex = `${9999 - item.depIndex}`
    }
  })
  const uninstallItem = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (onUninstall) {
      onUninstall(item)
    }
  }

  const uninstallAvailable = !!onUninstall && item.from?.importer

  return (
    <div className="group relative z-10" ref={divRef}>
      {item.stacked ?
        <>
          {item.size > 2 ?
            <div
              className={`absolute left-2 top-2 h-full w-[96%] rounded-lg border bg-card transition-all ${onSelect ? 'group-hover:bg-card-accent' : ''}`}
            />
          : ''}
          <div
            className={`absolute left-1 top-1 h-full w-[98%] rounded-lg border bg-card transition-all ${onSelect ? 'group-hover:bg-card-accent' : ''}`}
          />
        </>
      : ''}
      <Card
        role="article"
        className={`relative my-4 cursor-default transition-all ${highlight ? 'border-muted' : ''} ${onSelect ? 'group-hover:bg-card-accent' : ''}`}
        onClick={onSelect}>
        <CardHeader className="relative flex w-full flex-col rounded-t-lg p-0">
          <div className="flex items-center px-3 py-2">
            <div className="align-baseline">
              {item.depName && item.depName !== item.name && (
                <>
                  <DataBadge
                    variant="mono"
                    classNames={{
                      wrapperClassName: '',
                      contentClassName: 'pt-0.5',
                    }}
                    content={item.depName}
                  />
                  <span className="mr-2 font-courier text-sm text-muted-foreground">
                    as
                  </span>
                </>
              )}
              <span className="text-sm font-medium">{item.name}</span>
              {!item.id.startsWith('uninstalled-dep:') && (
                <span className="ml-2 font-courier text-sm font-normal text-muted-foreground">
                  {`v${item.version}`}
                </span>
              )}
            </div>
            {uninstallAvailable && (
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-auto cursor-default">
                  <Ellipsis
                    className="text-muted-foreground"
                    size={20}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="z-[10000] ml-48 w-48"
                  align="end"
                  onCloseAutoFocus={e => e.preventDefault()}>
                  <DropdownMenuItem onClick={uninstallItem}>
                    <PackageMinus size={16} />
                    Remove dependency
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {!isWorkspace && (
            <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 border-t-[1px] border-muted px-3 py-2">
              {item.spec?.bareSpec && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Spec:
                  </p>
                  <DataBadge
                    variant="mono"
                    classNames={{
                      wrapperClassName:
                        'inline-flex max-w-[20ch] break-all h-[1.375rem]',
                      contentClassName: 'truncate pt-0.5',
                    }}
                    tooltip={{
                      content:
                        (
                          item.spec.type === 'registry' &&
                          item.spec.semver
                        ) ?
                          item.spec.semver
                        : item.spec.bareSpec,
                    }}
                    content={
                      (
                        item.spec.type === 'registry' &&
                        item.spec.semver
                      ) ?
                        item.spec.semver
                      : item.spec.bareSpec
                    }
                  />
                  {item.size > 1 && (
                    <span className="text-xs font-medium text-muted-foreground">
                      and {item.size - 1} more.
                    </span>
                  )}
                </div>
              )}
              {item.labels?.map(i => (
                <div key={i}>
                  <Badge
                    className={`grow-0 ${labelClassNamesMap.get(i) || ''}`}>
                    {i}
                  </Badge>
                </div>
              ))}
              {parent && (
                <Badge
                  className={`grow-0 ${labelClassNamesMap.get(item.type) || ''}`}>
                  {item.type}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
      </Card>
      {highlight ?
        <div className="absolute -right-4 top-7 w-4 border-t border-muted" />
      : dependencies ?
        <div
          className={`absolute -left-[9px] bottom-[62px] z-0 h-[13.35rem] h-[5px] w-[9px] rounded-bl-sm border-b border-l border-solid border-muted group-[&:nth-child(2)]:hidden group-[&:nth-child(3)]:h-24`}
          ref={lineRef}
        />
      : ''}
    </div>
  )
}
