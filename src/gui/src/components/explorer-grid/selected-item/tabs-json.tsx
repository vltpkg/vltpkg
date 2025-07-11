import { TabsTrigger } from '@/components/ui/tabs.tsx'
import { CodeBlock } from '@/components/ui/shiki.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  MotionTabsContent,
  tabMotion,
} from '@/components/explorer-grid/selected-item/helpers.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { JSONOutputItem } from '@vltpkg/graph'

export const TabsJsonButton = () => {
  return (
    <TabsTrigger variant="ghost" value="json" className="w-fit px-2">
      JSON
    </TabsTrigger>
  )
}

const getJsonContent = (item: GridItemData): JSONOutputItem[] => {
  return [
    {
      name: item.name || '',
      fromID: item.from?.id,
      spec: item.spec ? String(item.spec) : undefined,
      type: item.type,
      to: item.to,
      overridden: item.spec?.overridden || false,
    },
  ]
}

export const TabsJsonContent = () => {
  const itemJson = useSelectedItemStore(state => state.selectedItem)
  const jsonOutput = getJsonContent(itemJson)

  return (
    <MotionTabsContent
      {...tabMotion}
      value="json"
      className="h-full rounded-b-lg bg-neutral-100 dark:bg-black">
      <CodeBlock
        className="px-6 py-4"
        code={JSON.stringify(jsonOutput, null, 2)}
        lang="json"
      />
    </MotionTabsContent>
  )
}
