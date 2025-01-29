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
}

export const SideItem = ({
  dependencies,
  item,
  highlight,
  parent,
  onSelect,
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
              className={`transition-all absolute border top-2 left-2 w-[96%] h-full bg-card rounded-lg ${onSelect ? 'group-hover:border-neutral-400 dark:group-hover:border-neutral-600' : ''}`}
            />
          : ''}
          <div
            className={`transition-all absolute border top-1 left-1 w-[98%] h-full bg-card rounded-lg ${onSelect ? 'group-hover:border-neutral-400 dark:group-hover:border-neutral-600' : ''}`}
          />
        </>
      : ''}
      <Card
        role="article"
        className={`transition-all relative my-4 ${highlight ? 'border-foreground' : ''} ${onSelect ? 'cursor-pointer group-hover:border-neutral-400 dark:group-hover:border-neutral-600' : ''}`}
        onClick={onSelect}>
        <CardHeader className="rounded-t-lg relative flex flex-col w-full p-0">
          <div className="flex items-center px-3 py-2">
            <CardTitle
              className={`text-sm font-medium flex-1 items-center ${uninstallAvailable ? 'pl-8' : ''}`}>
              {item.name}
            </CardTitle>
            <div className="px-2 py-1 border-[1px] border-solid rounded-full flex-initial">
              <p className="text-xs">{item.version}</p>
            </div>
          </div>
          <div className="flex items-center flex-row justify-between gap-2 flex-wrap px-3 py-2 border-muted-foreground/20 border-t-[1px]">
            <p className="text-sm text-muted-foreground">
              {item.title}
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
        </CardHeader>
      </Card>
      {uninstallAvailable ?
        <div className="absolute top-3 left-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-8 flex-none">
              <Ellipsis className="text-muted-foreground" size={20} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-48 ml-48"
              onCloseAutoFocus={e => e.preventDefault()}>
              <DropdownMenuItem onClick={uninstallItem}>
                <PackageMinus size={16} />
                Remove dependency
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      : ''}
      {highlight ?
        <div className="absolute border-t border-solid border-muted-foreground w-4 -right-4 top-7" />
      : dependencies ?
        <div
          className={`absolute border-b border-l border-solid border-neutral-300 dark:border-neutral-600 rounded-bl-sm z-0 h-[5px] w-[9px] -left-[9px] h-[13.35rem] bottom-[62px] group-[&:nth-child(2)]:hidden group-[&:nth-child(3)]:h-24`}
          ref={lineRef}
        />
      : ''}
    </div>
  )
}
