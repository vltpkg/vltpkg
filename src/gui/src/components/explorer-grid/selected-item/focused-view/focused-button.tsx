import { Fullscreen, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { useFocusState } from '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx'
import { cn } from '@/lib/utils.ts'

interface FocusButtonProps {
  className?: string
}

export const FocusButton = ({ className }: FocusButtonProps) => {
  const { focused, setFocused } = useFocusState()

  const toggleFocus = () => setFocused(!focused)

  return (
    <Button
      onClick={toggleFocus}
      className={cn(
        'border-muted text-muted-foreground hover:border-muted-foreground/30 relative inline-flex h-7 w-24 items-center gap-1.5 border-[1px] bg-white px-3 py-1.5 text-sm transition-colors duration-250 hover:bg-white/80 dark:bg-neutral-900 dark:hover:bg-neutral-900/80',
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
