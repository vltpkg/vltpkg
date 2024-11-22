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
      'pt-6 text-md flex flex-row items-center font-medium',
      className,
    )}
    {...props}>
    {children}
  </div>
)
