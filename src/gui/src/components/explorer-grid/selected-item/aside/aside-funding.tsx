import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { getKnownHostname } from '@/utils/get-known-hostname.ts'
import {
  AsideHeader,
  AsideSection,
  AsideItem,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { useEmptyCheck } from '@/components/explorer-grid/selected-item/aside/use-empty-check.tsx'

export const AsideFunding = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const manifestFunding = manifest?.funding
  const { isFundingEmpty } = useEmptyCheck()

  if (isFundingEmpty) return null

  const funding =
    !Array.isArray(manifestFunding) ?
      [manifestFunding]
    : manifestFunding

  return (
    <AsideSection>
      <AsideHeader>Funding</AsideHeader>
      {funding.map((item, idx) => (
        <AsideItem key={idx} href={item?.url}>
          {(item?.url && getKnownHostname(item.url)) || 'Website'}
        </AsideItem>
      ))}
    </AsideSection>
  )
}
