import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { getIconSet } from '@/utils/dashboard-tools.tsx'
import { format } from 'date-fns'

import type { MouseEvent } from 'react'
import type { DashboardDataProject } from '@/state/types.ts'

export interface DashboardItemOptions {
  item: DashboardDataProject
  onItemClick: (selectedProject: DashboardDataProject) => void
}

export const DashboardItem = ({
  item,
  onItemClick,
}: DashboardItemOptions) => {
  const { packageManager: PackageManager, runtime: RunTime } =
    getIconSet(item.tools)

  const onDashboardItemClick = (e: MouseEvent) => {
    e.preventDefault()
    onItemClick(item)
  }

  return (
    <article
      role="link"
      className="dark:bg-background dark:hover:bg-foreground/3 bg-foreground/2 hover:bg-background-secondary group/dashboard-item flex h-fit cursor-pointer flex-col rounded-lg border p-0.5 transition-colors duration-100"
      onClick={onDashboardItemClick}>
      <div className="bg-background dark:bg-foreground/3 flex rounded-[calc(0.5rem-(0.125rem/2))] border">
        <div className="flex flex-col p-3">
          {item.mtime && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <time className="text-xxs text-muted-foreground/60 cursor-default font-mono">
                    {format(
                      new Date(item.mtime).toJSON(),
                      'LLLL do, yyyy',
                    )}
                  </time>
                </TooltipTrigger>
                <TooltipContent side="top" align="start">
                  <time>
                    {format(
                      new Date(item.mtime).toJSON(),
                      'LLLL do, yyyy - HH:mm:ss',
                    )}
                  </time>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <h3 className="text-md mt-1 leading-tight font-medium tracking-tight">
            {item.name}
          </h3>
        </div>
      </div>
      <div className="flex gap-2 pt-0.5 pr-0 pb-0 pl-2">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger className="text-foreground/50 grow cursor-default truncate text-left text-xs">
              {item.readablePath}
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              {item.readablePath}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="dark:bg-foreground/3 bg-background flex gap-1 rounded-[calc(0.5rem-(0.125rem/2))] border p-1 [&_svg]:flex [&_svg]:size-3.5 [&_svg]:items-center [&_svg]:justify-center">
          {PackageManager && <PackageManager />}
          {RunTime && <RunTime />}
        </div>
      </div>
    </article>
  )
}
