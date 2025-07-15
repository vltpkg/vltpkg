import { getKnownHostname } from '@/utils/get-known-hostname.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  AsideHeader,
  AsideSection,
  AsideItem,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { useEmptyCheck } from '@/components/explorer-grid/selected-item/aside/use-empty-check.tsx'

export const AsideBugs = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const manifestBugs = manifest?.bugs
  const { isBugsEmpty } = useEmptyCheck()
  const bugs =
    !Array.isArray(manifestBugs) ? [manifestBugs] : manifestBugs

  if (isBugsEmpty) return null

  return (
    <AsideSection>
      <AsideHeader>Bug reports</AsideHeader>
      {bugs.map((item, idx) => (
        <AsideItem
          type={item?.type}
          key={idx}
          href={item?.url ?? item?.email}>
          {item?.url ?
            (getKnownHostname(item.url) ?? 'Website')
          : 'Email'}
        </AsideItem>
      ))}
    </AsideSection>
  )
}
