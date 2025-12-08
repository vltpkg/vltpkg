import { FileText } from 'lucide-react'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { Markdown } from '@/components/markdown-components.tsx'
import {
  contentMotion,
  MotionContent,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { SelectedItemEmptyState } from '@/components/explorer-grid/selected-item/empty-state.tsx'
import { useFocusState } from '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx'
import { cn } from '@/lib/utils.ts'

export const OverviewTabContent = () => {
  const readme = useSelectedItemStore(state => state.readme)
  const { focused } = useFocusState()

  return (
    <MotionContent {...contentMotion} className="flex flex-col">
      {readme ?
        <div
          className={cn(
            'prose-sm prose-neutral prose-li:list-disc w-full max-w-none p-6',
            focused && 'lg:max-w-[760px]',
          )}>
          <Markdown>{readme}</Markdown>
        </div>
      : <SelectedItemEmptyState
          icon={FileText}
          title="No Overview"
          description="We couldn't locate the metadata to display an overview for this project"
        />
      }
    </MotionContent>
  )
}
