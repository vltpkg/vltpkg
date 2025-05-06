import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

interface LinkProps extends React.ComponentPropsWithRef<'a'> {
  children: React.ReactNode
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <a
        {...props}
        ref={ref}
        target="_blank"
        className={cn(
          'group/link relative inline-flex cursor-default whitespace-nowrap text-blue-500 [&>svg]:ml-1',
          className,
        )}>
        <span className="inline-flex gap-2">{children}</span>
        <ArrowUpRight
          className="duration-250 transition-all group-hover/link:-translate-y-[2px] group-hover/link:translate-x-[2px]"
          size={14}
        />
      </a>
    )
  },
)
Link.displayName = 'Link'
