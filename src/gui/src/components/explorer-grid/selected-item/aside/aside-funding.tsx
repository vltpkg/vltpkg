import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { getSiteName } from '@/utils/get-site-name.ts'
import {
  AsideHeader,
  AsideSection,
  AsideItem,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { useEmptyCheck } from '@/components/explorer-grid/selected-item/aside/use-empty-check.tsx'

import type { NormalizedFunding } from '@vltpkg/types'

export const AsideFunding = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const funding = manifest?.funding as NormalizedFunding | undefined
  const { isFundingEmpty } = useEmptyCheck()

  if (isFundingEmpty) return null

  return (
    <AsideSection>
      <AsideHeader>Funding</AsideHeader>
      {funding?.map((item, idx) => (
        <AsideItem key={idx} href={item.url}>
          {getSiteName(item.url)}
        </AsideItem>
      ))}
    </AsideSection>
  )
}
