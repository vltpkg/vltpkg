import { CardTitle } from '@/components/ui/card.tsx'
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

const iconClassnames =
  'text-muted-foreground fill-muted-foreground transition-colors duration-250 size-6'

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
    <div
      role="link"
      className="group/card duration-250 group relative w-full cursor-default grid-rows-3 gap-3 rounded-lg border-[1px] bg-card transition-colors hover:border-muted hover:bg-card-accent"
      onClick={onDashboardItemClick}>
      <div className="flex justify-end px-3 py-3">
        {item.mtime && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger className="cursor-default text-xxs text-muted-foreground">
                {format(
                  new Date(item.mtime).toJSON(),
                  'LLLL do, yyyy',
                )}
              </TooltipTrigger>
              <TooltipContent side="top" align="start">
                <p className="">
                  {format(
                    new Date(item.mtime).toJSON(),
                    'LLLL do, yyyy - HH:mm:ss',
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex min-h-14 items-center px-3">
        <CardTitle className="text-md font-medium">
          {item.name}
        </CardTitle>
      </div>

      <div className="duration-250 flex w-full gap-2 border-t-[1px] px-3 py-1.5 transition-colors group-hover/card:border-muted">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger className="grow cursor-default truncate text-left text-xs text-muted-foreground">
              {item.readablePath}
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              {item.readablePath}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex gap-1">
          {PackageManager && (
            <PackageManager className={iconClassnames} />
          )}
          {RunTime && <RunTime className={iconClassnames} />}
        </div>
      </div>
    </div>
  )
}
