import { FileCode2 } from 'lucide-react'

export const EmptyState = () => {
  return (
    <div className="flex h-64 w-full items-center justify-center px-6 py-4">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="bg-secondary/60 relative flex size-32 items-center justify-center rounded-full">
          <FileCode2
            className="absolute z-[1] size-14 text-neutral-500"
            strokeWidth={1}
          />
        </div>
        <p className="text-muted-foreground w-2/3 text-pretty text-sm">
          The code for this project could not be loaded.
        </p>
      </div>
    </div>
  )
}
