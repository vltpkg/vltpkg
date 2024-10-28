import { useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { labelClassNamesMap } from './label-helper.js'
import { GridItemOptions } from './types.js'

export type SideItemOptions = GridItemOptions & {
  onClick: () => undefined
}

export const SideItem = ({
  dependencies,
  item,
  highlight,
  onClick,
}: SideItemOptions) => {
  // These refs and the code in useEffect are used to fix the line connection
  // height for when the dependency item takes up more space than a single line
  const divRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rect = divRef.current?.getBoundingClientRect()
    if (rect && lineRef.current && rect.height > 42.5) {
      lineRef.current.style.height = `${rect.height + 19}px`
    }
  })
  return (
    <div className="group relative z-10" ref={divRef}>
      {item.stacked ?
        <>
          {item.size > 2 ?
            <div className="absolute border top-2 left-2 w-[96%] h-full bg-card rounded-lg group-hover:border-indigo-600 group-hover:bg-indigo-100"></div>
          : ''}
          <div className="absolute border top-1 left-1 w-[98%] h-full bg-card rounded-lg group-hover:border-indigo-600 group-hover:bg-indigo-100"></div>
        </>
      : ''}
      <Card
        className={`transition-colors relative my-4 ${highlight ? 'border-primary' : ''} ${item.to ? 'cursor-pointer' : ''} group-hover:border-indigo-600 group-hover:bg-indigo-100`}
        onClick={onClick}>
        <CardHeader className="rounded-t-lg relative flex flex-row p-2 px-3">
          <CardTitle className="text-md grow">{item.title}</CardTitle>
          {item.labels?.length ?
            item.labels.map(i => (
              <div key={i}>
                {
                  <Badge
                    className={`mx-1 grow-0 ${labelClassNamesMap.get(i) || ''}`}>
                    {i}
                  </Badge>
                }
              </div>
            ))
          : ''}
        </CardHeader>
      </Card>
      {highlight ?
        <div className="absolute border-t border-solid border-primary w-4 -right-4 top-5"></div>
      : dependencies ?
        <div
          className="absolute border-b border-l border-solid border-gray-300 rounded-bl-sm z-0 w-[9px] h-16 -left-[9px] bottom-5"
          ref={lineRef}></div>
      : <div
          className="absolute border-b border-r border-solid border-gray-300 rounded-br-sm z-0 w-[9px] h-16 -right-[9px] bottom-5"
          ref={lineRef}></div>
      }
    </div>
  )
}
