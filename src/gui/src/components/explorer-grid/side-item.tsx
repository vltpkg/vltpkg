import { useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { labelClassNamesMap } from './label-helper.js'
import { GridItemOptions } from './types.js'

export type SideItemOptions = GridItemOptions & {
  onClick: () => undefined
  parent?: boolean
  idx?: number
}

export const SideItem = ({
  dependencies,
  item,
  highlight,
  onClick,
  parent,
  idx,
}: SideItemOptions) => {
  // These refs and the code in useEffect are used to fix the line connection
  // height for when the dependency item takes up more space than a single line
  const divRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (idx === 0) {
      const rect = divRef.current?.getBoundingClientRect()
      if (rect && lineRef.current && rect.height > 42.5) {
        lineRef.current.style.height = '0px'
        lineRef.current.style.borderBottomRightRadius = '0.125rem'
        lineRef.current.style.width = '1rem'
        lineRef.current.style.left = '-1rem'
        lineRef.current.style.top = '2.5rem'
      }
    }
    if (idx === 1) {
      const rect = divRef.current?.getBoundingClientRect()
      if (rect && lineRef.current && rect.height > 42.5) {
        lineRef.current.style.height = '6.7rem'
      }
    }
  }, [idx])

  return (
    <div className="group relative z-10" ref={divRef}>
      {item.stacked ?
        <>
          {item.size > 2 ?
            <div className="transition-all absolute border top-2 left-2 w-[96%] h-full bg-card rounded-lg group-hover:border-neutral-400 dark:group-hover:border-neutral-600" />
          : ''}
          <div className="transition-all absolute border top-1 left-1 w-[98%] h-full bg-card rounded-lg group-hover:border-neutral-400 dark:group-hover:border-neutral-600" />
        </>
      : ''}
      <Card
        tabIndex={1}
        role="article"
        className={`transition-all relative my-4 ${highlight ? 'border-foreground' : ''} ${item.to ? 'cursor-pointer' : ''} group-hover:border-neutral-400 dark:group-hover:border-neutral-600`}
        onClick={onClick}
        onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
          if (e.key === 'Enter') {
            onClick()
          }
        }}>
        <CardHeader className="rounded-t-lg relative flex flex-col w-full p-0">
          <div className="flex items-center justify-between px-3 py-2">
            <CardTitle className="text-sm font-medium flex items-center">
              {item.name}
            </CardTitle>
            <div className="px-2 py-1 border-[1px] border-solid rounded-full">
              <p className="text-xs">{item.version}</p>
            </div>
          </div>
          <div className="flex items-center flex-row justify-between gap-2 flex-wrap px-3 py-2 border-muted-foreground/20 border-t-[1px]">
            <p className="text-sm text-muted-foreground/50">
              {item.name}@{item.spec?.bareSpec || ''}
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
      {highlight ?
        <div className="absolute border-t border-solid border-muted-foreground w-4 -right-4 top-12" />
      : dependencies ?
        <div
          className="absolute border-b border-l border-solid border-neutral-300 dark:border-neutral-700 rounded-bl-sm z-0 w-[9px] -left-[9px] h-28 bottom-10"
          ref={lineRef}
        />
      : null}
    </div>
  )
}
