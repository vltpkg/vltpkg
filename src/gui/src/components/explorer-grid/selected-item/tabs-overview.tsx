import { AnimatePresence, motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { Markdown } from '@/components/markdown-components.tsx'
import {
  contentMotion,
  MotionContent,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { JellyTriangleSpinner } from '@/components/ui/jelly-spinner.tsx'
import { SelectedItemEmptyState } from '@/components/explorer-grid/selected-item/empty-state.tsx'
import { useFocusState } from '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx'
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
    <MotionContent {...contentMotion} className="flex flex-col">
      <AnimatePresence>
        {isReadmeLoading && !isLoadingDetails && !readme ?
          <motion.div
            {...overviewMotion}
            className={cn(
              'flex w-full items-center justify-center',
              focused ?
                'h-[calc(100svh-64px-96px-44px-1px)]'
              : 'h-[calc(100svh-65px-48.5px-96px-44px-1px)]',
            )}>
            <JellyTriangleSpinner />
          </motion.div>
        : !isReadmeLoading && !isLoadingDetails && !readme ?
          <motion.div {...overviewMotion}>
            <SelectedItemEmptyState
              icon={FileText}
              title="No Overview"
              description="We couldn't locate the metadata to display an overview for this project"
            />
          </motion.div>
        : <motion.div {...overviewMotion}>
            <div
              className={cn(
                'prose-sm prose-neutral prose-li:list-disc w-full max-w-none p-6',
                focused && 'lg:max-w-[760px]',
              )}>
              <Markdown>{readme}</Markdown>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </MotionContent>
  )
}
