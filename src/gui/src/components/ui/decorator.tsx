import { forwardRef } from 'react'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'

type DecoratorProps = ComponentProps<'div'>

export const Decorator = forwardRef<HTMLDivElement, DecoratorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        aria-hidden="true"
        className={cn('p-[0.5px]', className)}
        ref={ref}
        {...props}>
        <div className="bg-background h-full rounded" />
      </div>
    )
  },
)

Decorator.displayName = 'Decorator'
