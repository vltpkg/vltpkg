import { Fullscreen, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { useFocusState } from '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx'
import { isHostedEnvironment } from '@/lib/environment.ts'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'

type FocusButtonProps = ComponentProps<typeof Button>

export const FocusButton = ({ className }: FocusButtonProps) => {
  const { focused, setFocused } = useFocusState()
  const isHostedMode = isHostedEnvironment()

  const toggleFocus = () => setFocused(!focused)

  return (
    <Button
      disabled={isHostedMode}
      onClick={toggleFocus}
      className={cn(className)}
      variant="outline">
      <span>{focused ? 'Unfocus' : 'Focus'}</span>
      {focused ?
        <Minimize />
      : <Fullscreen />}
    </Button>
  )
}
