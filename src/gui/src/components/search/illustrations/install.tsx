import { cn } from '@/lib/utils.ts'

interface InstallIllustrationProps {
  className?: string
}

export const InstallIllustration = ({
  className,
}: InstallIllustrationProps) => {
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
            'dark:bg-foreground/9 mt-1.5 flex flex-col gap-1 overflow-hidden rounded-[calc(0.375rem-(0.25rem/2))] border bg-neutral-100 p-1',
            'text-muted-foreground text-xxs font-mono tabular-nums',
            '**:data-terminal-line:text-nowrap',
            '**:data-terminal-line:inline-flex **:data-terminal-line:items-center **:data-terminal-line:gap-1',
            '**:data-terminal-prefix:text-muted-foreground **:data-terminal-prefix:whitespace-pre-wrap',
            '**:data-terminal-command:text-amber-700 dark:**:data-terminal-command:text-amber-500',
            '**:data-terminal-output-success:text-green-700 dark:**:data-terminal-output-success:text-green-500',
          )}>
          <p data-terminal-line>
            <span data-terminal-prefix>$</span>
            <span data-terminal-command>curl -fsSL</span>
            <span data-terminal-output-success>
              https://vlt.sh/install
            </span>
          </p>
          <p data-terminal-line>
            <span data-terminal-prefix>
              {`% Total   % Received   Speed   Time`}
            </span>
          </p>
          <p data-terminal-line>
            <span
              data-terminal-prefix>{` 100      1469         100     1469`}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
