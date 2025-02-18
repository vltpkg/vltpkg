import { useRef, useEffect, type MouseEvent } from 'react'
import { Ellipsis, PackageMinus } from 'lucide-react'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu.jsx'
import { labelClassNamesMap } from './label-helper.js'
import { type GridItemData, type GridItemOptions } from './types.js'
import { useGraphStore } from '@/state/index.js'

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

  const parseItem = (title: string) => {
    const parsed = title.split('@')
    return parsed.length >= 3 ?
        parsed.slice(2).join('@')
      : parsed.slice(1).join('@')
  }

  return (
    <div className="group relative z-10" ref={divRef}>
      {item.stacked ?
        <>
          {item.size > 2 ?
            <div
              className={`absolute left-2 top-2 h-full w-[96%] rounded-lg border bg-card transition-all ${onSelect ? 'group-hover:border-neutral-400 dark:group-hover:border-neutral-600' : ''}`}
            />
          : ''}
          <div
            className={`absolute left-1 top-1 h-full w-[98%] rounded-lg border bg-card transition-all ${onSelect ? 'group-hover:border-neutral-400 dark:group-hover:border-neutral-600' : ''}`}
          />
        </>
      : ''}
      <Card
        role="article"
        className={`relative my-4 transition-all ${highlight ? 'border-foreground' : ''} ${onSelect ? 'cursor-pointer group-hover:border-neutral-400 dark:group-hover:border-neutral-600' : ''}`}
        onClick={onSelect}>
        <CardHeader className="relative flex w-full flex-col rounded-t-lg p-0">
          <div className="flex items-center px-3 py-2">
            <CardTitle className="flex flex-1 items-center gap-2 text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="font-normal text-muted-foreground">
                v{item.version}
              </span>
            </CardTitle>
            {uninstallAvailable && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Ellipsis
                    className="text-muted-foreground"
                    size={20}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="z-[10000] ml-48 w-48"
                  align="end"
                  onCloseAutoFocus={e => e.preventDefault()}>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={uninstallItem}>
                    <PackageMinus size={16} />
                    Remove dependency
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {!isWorkspace && (
            <div className="flex flex-row flex-wrap items-center justify-between gap-2 border-t-[1px] border-muted-foreground/20 px-3 py-2">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                Spec:{' '}
                <span className="flex items-center justify-center rounded-sm bg-neutral-700/5 px-2 py-1 font-[courier] text-xs dark:bg-neutral-700/50">
                  {parseItem(item.title)}
                </span>
              </p>
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
        <div className="absolute -right-4 top-7 w-4 border-t border-solid border-muted-foreground" />
      : dependencies ?
        <div
          className={`absolute -left-[9px] bottom-[62px] z-0 h-[13.35rem] h-[5px] w-[9px] rounded-bl-sm border-b border-l border-solid border-neutral-300 group-[&:nth-child(2)]:hidden group-[&:nth-child(3)]:h-24 dark:border-neutral-600`}
          ref={lineRef}
        />
      : ''}
    </div>
  )
}
