import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils.ts'

const Label = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-md border px-2.5 py-0.5 text-xs font-semibold',
      className,
    )}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
