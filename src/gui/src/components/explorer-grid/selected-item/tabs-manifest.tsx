import { TabsContent, TabsTrigger } from '@/components/ui/tabs.jsx'
import { CodeBlock } from '@/components/ui/shiki.jsx'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'

export const TabsManifestButton = () => {
  const { selectedItem } = useSelectedItem()

  if (!selectedItem.to?.manifest) return null

  return (
    <TabsTrigger
      variant="ghost"
      value="package.json"
      className="w-fit px-2">
      Manifest
    </TabsTrigger>
  )
}

export const TabsManifestContent = () => {
  const { selectedItem } = useSelectedItem()

  if (!selectedItem.to?.manifest) return null

  return (
    <TabsContent
      value="package.json"
      className="h-full rounded-b-lg bg-white dark:bg-black">
      <CodeBlock
        code={JSON.stringify(selectedItem.to.manifest, null, 2)}
        lang="json"
      />
    </TabsContent>
  )
}
