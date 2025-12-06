import { FileText } from 'lucide-react'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { Markdown } from '@/components/markdown-components.tsx'
import {
  contentMotion,
  MotionContent,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { SelectedItemEmptyState } from '@/components/explorer-grid/selected-item/empty-state.tsx'

export const OverviewTabContent = () => {
  const readme = useSelectedItemStore(state => state.readme)

  return (
    <MotionContent {...contentMotion} className="flex flex-col">
      {readme ?
        <div className="prose-sm prose-neutral prose-li:list-disc w-full max-w-none p-6 lg:max-w-2/3">
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
