import {
  ChevronLeft,
  ChevronRight,
  Folder,
  LayoutGrid,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils.ts'
import { Sidebar } from '@/components/icons/index.ts'

interface ConfigureIllustrationProps {
  className?: string
}

export const ConfigureIllustration = ({
  className,
}: ConfigureIllustrationProps) => {
  return (
    <div className={cn('relative', className)}>
      <div className="h-fit w-full rounded-md border">
        <div className="flex h-full w-full flex-col rounded-md">
          {/* header */}
          <div className="flex w-full items-center justify-between p-1">
            <div className="flex items-center gap-1.5">
              <ChevronLeft className="size-2.5 text-neutral-500 dark:text-neutral-700" />
              <ChevronRight className="size-2.5 text-neutral-500 dark:text-neutral-700" />
              <Sidebar className="size-2.5 text-neutral-500 dark:text-neutral-700" />
              <LayoutGrid className="size-2 fill-neutral-500 text-neutral-500 dark:fill-neutral-700 dark:text-neutral-700" />
            </div>
            <Search className="size-2.5 text-neutral-500 dark:text-neutral-700" />
          </div>

          {/* cols */}
          <div className="grid grid-cols-[auto_1fr] border-t">
            <div className="flex flex-col gap-1 border-r bg-neutral-100 px-1 py-1 dark:bg-neutral-900">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={`file-explorer-sidebar-${idx}`}
                  className="flex items-center gap-1">
                  <Folder className="size-2 fill-neutral-400 text-neutral-400 dark:fill-neutral-700 dark:text-neutral-700" />
                  <div className="h-1.5 w-[30px] rounded bg-neutral-300 dark:bg-neutral-700" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 px-1 py-1">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={`filer-explorer-content-${idx}`}
                  className="flex flex-col items-center justify-center gap-1">
                  <Folder className="size-4 fill-blue-500 text-blue-500 dark:fill-blue-700 dark:text-blue-700" />
                  <div className="h-1.5 w-[25px] rounded bg-neutral-300 dark:bg-neutral-700" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
