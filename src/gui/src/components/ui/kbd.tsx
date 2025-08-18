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
        'flex size-6 items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 font-mono text-xs text-muted-foreground dark:border-neutral-700 dark:bg-muted',
        className,
      )}>
      {children}
    </kbd>
  )
}
