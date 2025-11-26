import { cn } from '@/lib/utils.ts'

interface DiscoverIllustrationProps {
  className?: string
}

export const DiscoverIllustration = ({
  className,
}: DiscoverIllustrationProps) => {
  return (
    <div className={cn('relative', className)}>
      <div className="rounded-md border bg-neutral-100 p-0.5 dark:bg-neutral-950">
        <div className="flex gap-0.5">
          <div className="flex h-full w-[15px] flex-col items-center gap-1">
            <div className="mb-1 aspect-square w-[15px] rounded bg-neutral-300 dark:bg-neutral-800" />

            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`how-it-works-dashboard-sidebar-${idx}`}
                className="aspect-square w-[10px] rounded bg-neutral-300 dark:bg-neutral-800"
              />
            ))}
          </div>
          <div className="bg-background grid w-full grow grid-cols-5 gap-0.5 rounded-[calc(0.375rem-(0.125rem))] p-0.5">
            {Array.from({ length: 17 }).map((_, idx) => (
              <div
                key={`how-it-works-dashboard-item-${idx}`}
                className="bg-background flex h-[30px] w-full flex-col gap-px rounded-[calc(0.375rem-0.125rem)] border p-px">
                <div className="flex h-[15px] w-full flex-col gap-px rounded-[calc(0.25rem-0.5px)] border bg-neutral-100 px-[2px] py-[2px] dark:bg-neutral-900">
                  <div className="h-[4px] w-1/3 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-[4px] w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="flex h-[10px] items-center justify-between px-px">
                  <div className="h-[6px] w-2/3 rounded-[calc(0.25rem-0.5px)] bg-neutral-300 dark:bg-neutral-800" />
                  <div className="aspect-square h-[10px] rounded-[calc(0.25rem-0.5px)] border bg-neutral-100 dark:bg-neutral-900"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
