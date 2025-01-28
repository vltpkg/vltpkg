import { Button } from '@/components/ui/button.jsx'
import { House } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip.jsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.js'

const RootButton = () => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)

  const onClick = () => {
    updateActiveRoute('/explore')
    updateQuery(':root')
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={query === DEFAULT_QUERY}
            onClick={onClick}
            size="icon"
            variant="secondary">
            <House />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Go to project root</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { RootButton }
