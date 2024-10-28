import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils.js'

export const Title = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className,
    )}
    {...props}
  />
))
Title.displayName = 'Title'
