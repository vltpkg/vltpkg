import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { cn } from '@/lib/utils.ts'

import type { PartialError } from '@/lib/external-info.ts'

/** Friendly names for data sources */
const dataSourceLabels: Record<string, string> = {
  'npm-packument': 'npm package info',
  'npm-manifest': 'npm manifest',
  'npm-downloads': 'download stats',
  'npm-downloads-versions': 'version downloads',
  'github-repo': 'GitHub repository',
  'github-issues': 'GitHub issues',
  'github-prs': 'GitHub pull requests',
  readme: 'README',
  contributors: 'contributors',
}

interface PartialErrorsIndicatorProps {
  className?: string
}

export const PartialErrorsIndicator = ({
  className,
}: PartialErrorsIndicatorProps) => {
  const isLoadingDetails = useSelectedItemStore(
    state => state.isLoadingDetails,
  )
  const partialErrors = useSelectedItemStore(
    state => state.partialErrors,
  )

  const hasPartialErrors =
    !isLoadingDetails && partialErrors && partialErrors.length > 0

  if (!hasPartialErrors) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'absolute top-2 right-2 z-10 cursor-help',
              className,
            )}>
            <div className="bg-warning/20 flex items-center gap-1.5 rounded-full px-2 py-1 text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {partialErrors.length} failed
              </span>
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="mb-2 text-xs font-medium">
            Some data sources failed to load:
          </p>
          <ul className="space-y-1">
            {partialErrors.map((error: PartialError, idx: number) => (
              <li key={idx} className="text-muted-foreground text-xs">
                <span className="font-medium">
                  {dataSourceLabels[error.source] || error.source}
                </span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
