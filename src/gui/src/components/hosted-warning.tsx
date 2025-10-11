import { Link } from 'react-router'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils.ts'
import { InlineCode } from '@/components/ui/inline-code.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ArrowUpRight } from 'lucide-react'

import type { ComponentProps } from 'react'

type HostedWarningProps = ComponentProps<'div'>

export const HostedWarning = forwardRef<
  HTMLDivElement,
  HostedWarningProps
>(({ className, ...rest }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full flex-col items-center justify-center px-8 py-4',
        className,
      )}
      {...rest}>
      <div className="flex flex-col items-start justify-start gap-4">
        <h1 className="text-3xl font-medium tracking-tight">
          Hosted Demo Mode
        </h1>
        <p className="text-balanced text-muted-foreground">
          This is a static hosted version of the vlt registry. <br />
          The application requires a local vlt server to display local
          project data.
          <br /> To use the full dashboard features, please run the
          gui locally with <InlineCode>vlt serve</InlineCode>.
        </p>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-2xl border-neutral-300 bg-neutral-200 hover:border-neutral-400 hover:bg-neutral-300 dark:border-muted hover:dark:bg-neutral-900">
          <Link to="https://docs.vlt.sh/cli" target="_blank">
            Install the Client
            <div className="flex size-5 items-center justify-center rounded-md border border-neutral-300 bg-white text-muted-foreground dark:border-muted dark:bg-black [&_svg]:size-3">
              <ArrowUpRight />
            </div>
          </Link>
        </Button>
      </div>
    </div>
  )
})

HostedWarning.displayName = 'HostedWarning'
