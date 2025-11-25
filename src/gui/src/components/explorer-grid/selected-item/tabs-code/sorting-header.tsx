import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

import type { LucideIcon } from 'lucide-react'
import type { SortingDirection } from '@/components/explorer-grid/selected-item/tabs-code/types.ts'

export const SortingHeader = ({
  label,
  onClick,
  dir,
  icon: Icon,
}: {
  label: string
  onClick: () => void
  dir: SortingDirection
  icon?: LucideIcon
}) => {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      data-dir={dir}
      className={cn(
        '[&_svg]:text-muted-foreground group flex h-7 items-center gap-2 rounded-xl border-transparent transition-colors duration-100 [&_svg]:transition-colors [&_svg]:duration-100',
        'bg-neutral-100 hover:border-neutral-300 hover:bg-neutral-200',
        'dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800',
      )}>
      {Icon && (
        <Icon className="size-5 group-hover:text-black group-hover:dark:text-white" />
      )}

      <span className="text-muted-foreground text-sm font-medium transition-colors duration-100 group-hover:text-black group-hover:dark:text-white">
        {label}
      </span>

      <div className="flex flex-col items-center [&_svg]:size-[0.75rem]">
        <ChevronUp className="group-data-[dir=asc]:text-foreground" />
        <ChevronDown className="group-data-[dir=desc]:text-foreground" />
      </div>
    </Button>
  )
}
