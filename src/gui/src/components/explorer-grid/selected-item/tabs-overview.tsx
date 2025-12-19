import { AnimatePresence, motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { Markdown } from '@/components/markdown-components.tsx'
import {
  contentMotion,
  MotionContent,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { useFocusState } from '@/components/explorer-grid/selected-item/use-focus-state.tsx'
import { JellyTriangleSpinner } from '@/components/ui/jelly-spinner.tsx'
import { SelectedItemEmptyState } from '@/components/explorer-grid/selected-item/empty-state.tsx'
import { AsideOverview } from '@/components/explorer-grid/selected-item/aside/index.tsx'
import { Cross } from '@/components/ui/cross.tsx'
import { cn } from '@/lib/utils.ts'

import type { MotionProps } from 'framer-motion'

const overviewMotion: MotionProps = {
  initial: { opacity: 0, filter: 'blur(2px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(2px)' },
}

export const OverviewTabContent = () => {
  const readme = useSelectedItemStore(state => state.readme)
  const isReadmeLoading = useSelectedItemStore(
    state => state.isReadmeLoading,
  )
  // Because we show a loading state on the entire `selected-item/item.tsx`
  // We can prevent double loaders by checking the root loading state
  const isLoadingDetails = useSelectedItemStore(
    state => state.isLoadingDetails,
  )
  const { focused } = useFocusState()

  return (
    <MotionContent
      {...contentMotion}
      className="relative flex h-full w-full flex-col overflow-hidden">
      <AnimatePresence>
        {isReadmeLoading && !isLoadingDetails && !readme ?
          <motion.div
            {...overviewMotion}
            className={cn(
              'flex h-[calc(100svh-65px-48.5px-96px-44px-1px)] w-full items-center justify-center',
            )}>
            <JellyTriangleSpinner />
          </motion.div>
        : !isReadmeLoading && !isLoadingDetails && !readme ?
          <motion.div {...overviewMotion} className="h-full">
            <SelectedItemEmptyState
              icon={FileText}
              title="No Overview"
              description="We couldn't locate the metadata to display an overview for this project"
            />
          </motion.div>
        : <motion.div
            {...overviewMotion}
            className="h-full w-full min-w-0">
            <div className="divide-background-secondary flex h-full w-full min-w-0 flex-col justify-between divide-x lg:flex-row">
              <div className="prose-sm prose-neutral prose-li:list-disc relative order-2 h-full max-w-none min-w-0 flex-1 overflow-y-auto p-6 lg:order-1">
                <Markdown>{readme}</Markdown>
                <Cross right top />
              </div>
              <AsideOverview
                className={cn(
                  'order-1 h-fit transition-all duration-300 lg:order-2 lg:h-full lg:min-w-0 lg:overflow-x-hidden lg:overflow-y-auto',
                  focused ?
                    'lg:basis-[250px]'
                  : 'lg:shrink lg:basis-[200px]',
                )}
              />
            </div>
          </motion.div>
        }
      </AnimatePresence>
      <Cross bottom left />
      <Cross bottom right />
    </MotionContent>
  )
}
