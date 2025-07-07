import { Fullscreen, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

interface FocusButtonProps {
  focused: boolean
  setFocused: (focused: FocusButtonProps['focused']) => void
  className?: string
}

export const FocusButton = ({
  focused,
  setFocused,
  className,
}: FocusButtonProps) => {
  const toggleFocus = () => setFocused(!focused)

  return (
    <Button
      onClick={toggleFocus}
      className={cn(
        'duration-250 relative inline-flex h-7 w-24 items-center gap-1.5 border-[1px] border-muted bg-white px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/30 hover:bg-white/80 dark:bg-neutral-900 dark:hover:bg-neutral-900/80',
        className,
      )}
      variant="default">
      <span>{focused ? 'Unfocus' : 'Focus'}</span>
      {focused ?
        <Minimize />
      : <Fullscreen />}
    </Button>
  )
}
