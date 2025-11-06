import React from 'react'
import { cn } from '@/lib/utils.ts'

interface KbdProps {
  children: React.ReactNode
  className?: string
}

export const Kbd = ({ children, className }: KbdProps) => {
  return (
    <kbd
      className={cn(
        'text-muted-foreground dark:bg-muted flex size-6 items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 font-mono text-xs dark:border-neutral-700',
        className,
      )}>
      {children}
    </kbd>
  )
}
