import React from 'react'

interface KbdProps {
  children: React.ReactNode
  className?: string
}

export const Kbd = ({ children, className = '' }: KbdProps) => {
  return (
    <kbd
      className={`flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-sm border border-border bg-muted font-mono text-xs text-muted-foreground dark:bg-black ${className}`}>
      {children}
    </kbd>
  )
}
