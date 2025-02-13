import { type ReactNode } from 'react'
import { cn } from '@/lib/utils.js'

export const GridHeader = ({
  children,
  className,
  ...props
}: {
  className?: string
  children: ReactNode
}) => (
  <div
    className={cn(
      'text-md flex flex-row items-center pt-6 font-medium',
      className,
    )}
    {...props}>
    {children}
  </div>
)
