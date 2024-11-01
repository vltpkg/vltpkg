import React from 'react'

interface KbdProps {
  children: React.ReactNode
  className?: string
}

export const Kbd = ({ children, className = '' }: KbdProps) => {
  return (
    <kbd
      className={`flex items-center justify-center rounded-sm h-[1.5rem] w-[1.5rem] text-xs font-mono text-foreground bg-muted border border-muted-foreground/20 ${className}`}>
      {children}
    </kbd>
  )
}
