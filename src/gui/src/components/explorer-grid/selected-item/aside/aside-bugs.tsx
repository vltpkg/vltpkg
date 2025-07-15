import { getSiteName } from '@/utils/get-site-name.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  AsideHeader,
  AsideSection,
  AsideItem,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { useEmptyCheck } from '@/components/explorer-grid/selected-item/aside/use-empty-check.tsx'

import type { NormalizedBugs } from '@vltpkg/types'

export const AsideBugs = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const bugs = manifest?.bugs as NormalizedBugs | undefined
  const { isBugsEmpty } = useEmptyCheck()

  if (isBugsEmpty) return null

  return (
    <AsideSection>
      <AsideHeader>Bug reports</AsideHeader>
      {bugs?.map((item, idx) => (
        <AsideItem type={item.type} key={idx} href={item.url}>
          {item.type === 'link' && item.url ?
            getSiteName(item.url)
          : item.type === 'email' ?
            item.email
          : item.url}
        </AsideItem>
      ))}
    </AsideSection>
  )
}
