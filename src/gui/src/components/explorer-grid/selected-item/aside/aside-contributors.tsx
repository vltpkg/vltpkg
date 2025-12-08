import {
  AsideHeader,
  AsideSection,
} from '@/components/explorer-grid/selected-item/aside/aside.tsx'
import { ContributorAvatar } from '@/components/explorer-grid/selected-item/tabs-contributors.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  useSelectedItemStore,
  useTabNavigation,
} from '@/components/explorer-grid/selected-item/context.tsx'
import { splitArray } from '@/utils/split-array.ts'
import { cn } from '@/lib/utils.ts'

export const AsideContributors = () => {
  const { setActiveTab } = useTabNavigation()
  const contributors = useSelectedItemStore(
    state => state.contributors,
  )

  const handleContributorsNavigate = () =>
    setActiveTab('contributors')

  if (!contributors || contributors.length === 0) return null

  const [firstContributors, restContributors] = splitArray(
    [...contributors],
    10,
  )

  return (
    <AsideSection>
      <AsideHeader>Contributors</AsideHeader>
      <div
        className={cn(
          'flex flex-wrap',
          contributors.length > 2 ? '-space-x-2' : 'space-x-2',
        )}>
        {firstContributors.map((contributor, idx) => (
          <button
            key={`contributor-${idx}`}
            onClick={handleContributorsNavigate}
            className="cursor-pointer">
            <ContributorAvatar
              size="sm"
              avatar={contributor.avatar}
            />
          </button>
        ))}
      </div>

      {restContributors.length !== 0 && (
        <Button
          onClick={handleContributorsNavigate}
          variant="outline"
          className="text-muted-foreground mt-1 h-7 rounded-lg p-0 px-2 font-mono text-sm tabular-nums">
          + {restContributors.length} More
        </Button>
      )}
    </AsideSection>
  )
}
