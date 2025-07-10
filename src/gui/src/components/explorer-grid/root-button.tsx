import { Button } from '@/components/ui/button.tsx'
import { House } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipPortal,
} from '@/components/ui/tooltip.tsx'
import { cn } from '@/lib/utils.ts'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.ts'

interface RootButtonProps {
  className?: string
}

const RootButton = ({ className }: RootButtonProps) => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)

  const onClick = () => {
    updateQuery(DEFAULT_QUERY)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={query === DEFAULT_QUERY}
            onClick={onClick}
            size="icon"
            className={cn(
              'rounded-sm border-[1px] border-muted bg-card text-muted-foreground hover:bg-card/50 dark:bg-card dark:hover:bg-card/50',
              className,
            )}>
            <House />
          </Button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent>Go to project root</TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}

export { RootButton }
