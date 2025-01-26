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

export type SideItemOptions = GridItemOptions & {
  parent?: boolean
  idx?: number
  onSelect: () => undefined
  onUninstall?: (item: GridItemData) => void
}

export const SideItem = ({
  dependencies,
  item,
  highlight,
  parent,
  idx,
  onSelect,
  onUninstall,
}: SideItemOptions) => {
  // These refs and the code in useEffect are used to fix the line connection
  // height for when the first dependency item title takes up more space than
  // a single line, which should be a very rare occasion
  const divRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (idx === 1) {
      const rect = divRef.current?.getBoundingClientRect()
      if (rect && lineRef.current && rect.height > 86) {
        lineRef.current.style.height = '124px'
      }
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
            <div className="absolute left-2 top-2 h-full w-[96%] rounded-lg border bg-card transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600" />
          : ''}
          <div className="absolute left-1 top-1 h-full w-[98%] rounded-lg border bg-card transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-600" />
        </>
      : ''}
      <Card
        role="article"
        className={`relative my-4 transition-all ${highlight ? 'border-foreground' : ''} cursor-pointer group-hover:border-neutral-400 dark:group-hover:border-neutral-600`}
        onClick={onSelect}>
        <CardHeader className="relative flex w-full flex-col rounded-t-lg p-0">
          <div className="flex items-center px-3 py-2">
            <CardTitle
              className={`flex-1 items-center text-sm font-medium ${uninstallAvailable ? 'pl-8' : ''}`}>
              {item.name}
            </CardTitle>
            <div className="flex-initial rounded-full border-[1px] border-solid px-2 py-1">
              <p className="text-xs">{item.version}</p>
            </div>
          </div>
          <div className="flex flex-row flex-wrap items-center justify-between gap-2 border-t-[1px] border-muted-foreground/20 px-3 py-2">
            <p className="text-sm text-muted-foreground/50">
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
        <div className="absolute left-3 top-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-8 flex-none">
              <Ellipsis className="text-muted-foreground" size={20} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="ml-48 w-48"
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
        <div className="absolute -right-4 top-7 w-4 border-t border-solid border-muted-foreground" />
      : dependencies ?
        <div
          className="absolute -left-[9px] bottom-[62px] z-0 h-[13.35rem] w-[9px] rounded-bl-sm border-b border-l border-solid border-neutral-300 group-[&:nth-child(2)]:hidden group-[&:nth-child(3)]:h-24 dark:border-neutral-700"
          ref={lineRef}
        />
      : null}
    </div>
  )
}
