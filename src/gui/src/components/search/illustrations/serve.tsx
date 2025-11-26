import { cn } from '@/lib/utils.ts'

interface ServeIllustrationProps {
  className?: string
}

export const ServeIllustration = ({
  className,
}: ServeIllustrationProps) => {
  return (
    <div className={cn('relative', className)}>
      <div className="h-fit w-full rounded-md border px-px py-1.5">
        <div className="relative flex w-full px-1">
          <div className="flex gap-1">
            {['red', 'yellow', 'green'].map((color, idx) => (
              <span
                key={`how-it-works-terminal-traffic-${idx}`}
                className={cn(
                  'size-1.5 rounded-full',
                  color === 'red' && 'bg-red-600',
                  color === 'green' && 'bg-green-600',
                  color === 'yellow' && 'bg-amber-600',
                )}
              />
            ))}
          </div>

          <span className="text-foreground/80 absolute w-full self-center text-center font-mono text-[0.6rem]"></span>
        </div>
        <div
          className={cn(
            'dark:bg-foreground/9 mt-1.5 flex flex-col gap-1 rounded-[calc(0.375rem-(0.25rem/2))] border bg-neutral-100 p-1',
            'text-muted-foreground text-xxs font-mono tabular-nums',
            '**:data-terminal-line:inline-flex **:data-terminal-line:items-center **:data-terminal-line:gap-1',
            '**:data-terminal-prefix:text-muted-foreground',
            '**:data-terminal-command:text-amber-700 dark:**:data-terminal-command:text-amber-500',
            '**:data-terminal-output-success:text-green-700 dark:**:data-terminal-output-success:text-green-500',
          )}>
          <p data-terminal-line>
            <span data-terminal-prefix>$</span>
            <span data-terminal-command>vlt</span>
            serve
          </p>
          <p data-terminal-line>Starting UI server...</p>
          <p data-terminal-output-success>
            ⚡ vlt UI running on localhost:8000
          </p>
        </div>
      </div>
    </div>
  )
}
