import type { LucideIcon } from 'lucide-react'

export const EmptyState = ({
  icon: Icon,
  message,
}: {
  icon: LucideIcon
  message: string
}) => {
  return (
    <div className="flex h-64 w-full cursor-default items-center justify-center px-6 py-4">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative flex size-32 items-center justify-center rounded-full bg-secondary/60">
          <Icon
            className="absolute z-[3] size-14 text-neutral-500"
            strokeWidth={1.25}
          />
        </div>
        <p className="w-2/3 text-pretty text-sm text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  )
}
