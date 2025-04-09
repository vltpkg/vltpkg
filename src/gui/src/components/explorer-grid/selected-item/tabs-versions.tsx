import { TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import { History } from 'lucide-react'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import { rcompare } from '@vltpkg/semver'

export const VersionsTabButton = () => {
  return (
    <TabsTrigger
      variant="ghost"
      value="versions"
      className="w-fit px-2">
      Versions
    </TabsTrigger>
  )
}

export const VersionsTabContent = () => {
  const { selectedItemDetails } = useSelectedItem()

  const versions = selectedItemDetails.versions ?? []
  const greaterVersions = selectedItemDetails.greaterVersions ?? []

  const isEmpty =
    versions.length === 0 && greaterVersions.length === 0

  return (
    <TabsContent value="versions">
      {isEmpty ?
        <div className="flex h-64 w-full items-center justify-center px-6 py-4">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="relative flex size-32 items-center justify-center rounded-full bg-secondary/60">
              <History
                className="absolute z-[4] size-14 text-neutral-500"
                strokeWidth={1}
              />
            </div>
            <p className="w-2/3 text-pretty text-sm text-muted-foreground">
              There is no versioning information about this package
              yet
            </p>
          </div>
        </div>
      : <section className="flex flex-col gap-4 px-6 py-4">
          {greaterVersions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Greater Versions
              </p>
              <ul className="flex flex-col divide-y-[1px] divide-border">
                {greaterVersions
                  .sort((a, b) => rcompare(a, b))
                  .map((version, idx) => (
                    <li
                      key={idx}
                      className="py-1.5 font-mono text-sm">
                      {version}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {versions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                All Versions
              </p>
              <ul className="flex flex-col divide-y-[1px] divide-border">
                {versions
                  .sort((a, b) => rcompare(a, b))
                  .map((version, idx) => (
                    <li
                      key={idx}
                      className="py-1.5 font-mono text-sm">
                      {version}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      }
    </TabsContent>
  )
}
