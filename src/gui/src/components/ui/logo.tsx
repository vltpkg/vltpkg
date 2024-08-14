import * as React from 'react'
import { cn } from '@/lib/utils'

export const Logo = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className }, ref) => (
  <div ref={ref} className={cn('flex flex-row', className)}>
    <h1>
      <span className="text-2xl font-semibold leading-none pr-2 tracking-wide">
        vlt
      </span>
      <span className="text-2xl font-light leading-none text-zinc-500 tracking-wide">
        {'/vōlt/'}
      </span>
    </h1>
  </div>
))
Logo.displayName = 'Logo'
