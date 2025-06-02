import type { ReactNode } from 'react'
import { cn } from '@/lib/utils.ts'

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
      'flex h-[3rem] cursor-default flex-row items-center text-sm font-medium',
      className,
    )}
    {...props}>
    {children}
  </div>
)
