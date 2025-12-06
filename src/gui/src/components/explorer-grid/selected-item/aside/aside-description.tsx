import {
  AsideHeader,
  AsideSection,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { Markdown } from '@/components/markdown-components.tsx'

export const AsideDescription = () => {
  const manifest = useSelectedItemStore(state => state.manifest)

  if (!manifest?.description) return null

  return (
    <AsideSection>
      <AsideHeader>Description</AsideHeader>
      <div className="prose-sm prose-neutral max-w-none text-sm">
        <Markdown>{manifest.description}</Markdown>
      </div>
    </AsideSection>
  )
}
