import {
  AsideHeader,
  AsideSection,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'

export const AsideKeywords = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const item = useSelectedItemStore(state => state.selectedItem)

  const keywords = manifest?.keywords

  if (!keywords || keywords.length === 0) return null

  return (
    <AsideSection>
      <AsideHeader>Keywords</AsideHeader>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, idx) => (
          <DataBadge
            key={`${item.name}-keyword-${keyword}-${idx}`}
            content={keyword}
          />
        ))}
      </div>
    </AsideSection>
  )
}
