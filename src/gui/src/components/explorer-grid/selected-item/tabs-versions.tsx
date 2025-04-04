import { TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import { rcompare } from '@vltpkg/semver'

export const VersionsTabButton = () => {
  const { selectedItemDetails } = useSelectedItem()

  if (!selectedItemDetails.versions) return null

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

  if (
    (!selectedItemDetails.versions ||
      selectedItemDetails.versions.length === 0) &&
    (!selectedItemDetails.greaterVersions ||
      selectedItemDetails.greaterVersions.length === 0)
  ) {
    return null
  }

  return (
    <TabsContent value="versions" className="px-6 py-4">
      <section className="flex flex-col gap-4">
        {selectedItemDetails.greaterVersions &&
          selectedItemDetails.greaterVersions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Greater Versions
              </p>
              <ul className="flex flex-col divide-y-[1px] divide-border">
                {selectedItemDetails.greaterVersions
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

        {selectedItemDetails.versions &&
          selectedItemDetails.versions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                All Versions
              </p>
              <ul className="flex flex-col divide-y-[1px] divide-border">
                {selectedItemDetails.versions
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
    </TabsContent>
  )
}
