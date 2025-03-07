import React from 'react'

interface KbdProps {
  children: React.ReactNode
  className?: string
}

export const Kbd = ({ children, className = '' }: KbdProps) => {
  return (
    <kbd
      className={`flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-sm bg-muted font-mono text-xs text-muted-foreground ${className}`}>
      {children}
    </kbd>
  )
}
