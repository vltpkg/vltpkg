import { Aside } from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { AsideFunding } from '@/components/explorer-grid/selected-item/aside/aside-funding.tsx'
import { AsideRepo } from '@/components/explorer-grid/selected-item/aside/aside-repo.tsx'
import { AsideBugs } from '@/components/explorer-grid/selected-item/aside/aside-bugs.tsx'
import { AsideMetadata } from '@/components/explorer-grid/selected-item/aside/aside-metadata.tsx'
import { AsideKeywords } from '@/components/explorer-grid/selected-item/aside/aside-keywords.tsx'
import { AsideDescription } from '@/components/explorer-grid/selected-item/aside/aside-description.tsx'
import { InstallHelper } from '@/components/explorer-grid/selected-item/install-helper.tsx'
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
      <InstallHelper />
      <AsideDescription />
      <AsideRepo />
      <AsideFunding />
      <AsideBugs />
      <AsideMetadata />
      <AsideKeywords />
    </Aside>
  )
}
