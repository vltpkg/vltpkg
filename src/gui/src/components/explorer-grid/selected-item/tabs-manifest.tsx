import { TabsContent, TabsTrigger } from '@/components/ui/tabs.jsx'
import { CodeBlock } from '@/components/ui/shiki.jsx'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import { FileJson } from 'lucide-react'

export const TabsManifestButton = () => {
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
  const { manifest } = useSelectedItem()

  return (
    <TabsContent
      value="package.json"
      className="h-full rounded-b-lg bg-white dark:bg-black">
      {manifest ?
        <CodeBlock
          code={JSON.stringify(manifest, null, 2)}
          lang="json"
        />
      : <div className="flex h-64 items-center justify-center px-6 py-4">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="relative flex size-32 items-center justify-center rounded-full bg-secondary/60">
              <FileJson
                className="absolute z-[3] size-14 text-neutral-500"
                strokeWidth={1.25}
              />
            </div>
            <p className="w-2/3 text-pretty text-sm text-muted-foreground">
              We couldn't find a manifest for this project
            </p>
          </div>
        </div>
      }
    </TabsContent>
  )
}
