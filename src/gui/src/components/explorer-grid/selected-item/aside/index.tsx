import { Aside } from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { AsideFunding } from '@/components/explorer-grid/selected-item/aside/aside-funding.tsx'
import { AsideRepo } from '@/components/explorer-grid/selected-item/aside/aside-repo.tsx'
import { AsideBugs } from '@/components/explorer-grid/selected-item/aside/aside-bugs.tsx'
import { AsideMetadata } from '@/components/explorer-grid/selected-item/aside/aside-metadata.tsx'
import { useEmptyCheck } from '@/components/explorer-grid/selected-item/aside/use-empty-check.tsx'

interface AsideOverviewProps {
  className?: string
}

export const AsideOverview = ({ className }: AsideOverviewProps) => {
  const {
    isRepoEmpty,
    isFundingEmpty,
    isBugsEmpty,
    isMetadataEmpty,
  } = useEmptyCheck()

  if (isRepoEmpty && isFundingEmpty && isBugsEmpty && isMetadataEmpty)
    return null

  return (
    <Aside className={className}>
      <AsideRepo />
      <AsideFunding />
      <AsideBugs />
      <AsideMetadata />
    </Aside>
  )
}
