import { Button } from '@/components/ui/button.tsx'
import { House } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipPortal,
} from '@/components/ui/tooltip.tsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.ts'

const RootButton = () => {
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
            className="rounded-full border-[1px] border-muted bg-card text-muted-foreground hover:bg-card/50 dark:bg-card dark:hover:bg-card/50">
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
