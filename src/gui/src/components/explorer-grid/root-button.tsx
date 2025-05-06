import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button.tsx'
import { House } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip.tsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.ts'

const RootButton = () => {
  const navigate = useNavigate()
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)

  const onClick = () => {
    void navigate('/explore')
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
            variant="ghost"
            className="rounded-md">
            <House />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Go to project root</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { RootButton }
