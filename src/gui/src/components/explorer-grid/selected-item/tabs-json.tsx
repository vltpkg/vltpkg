import { CodeBlock } from '@/components/ui/code-block.tsx'
import {
  contentMotion,
  MotionContent,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { JSONOutputItem } from '@vltpkg/graph'

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
    <MotionContent {...contentMotion} className="h-full rounded">
      <CodeBlock
        filename=""
        hideFileName
        className="px-6 py-4"
        code={JSON.stringify(jsonOutput, null, 2)}
        language="json"
      />
    </MotionContent>
  )
}
