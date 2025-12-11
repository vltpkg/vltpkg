import { Button } from '@/components/ui/button.tsx'
import { ArrowLeft, UsersRound, CircleHelp } from 'lucide-react'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@radix-ui/react-avatar'
import {
  useSelectedItemStore,
  useTabNavigation,
} from '@/components/explorer-grid/selected-item/context.tsx'
import { cn } from '@/lib/utils.ts'
import { SelectedItemEmptyState } from '@/components/explorer-grid/selected-item/empty-state.tsx'
import {
  Tooltip,
  TooltipPortal,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import {
  MotionContent,
  contentMotion,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { useGraphStore } from '@/state/index.ts'

import type { Contributor } from '@/lib/external-info.ts'
import type { Action } from '@/state/types.ts'

interface ContributorAvatarProps {
  avatar: Contributor['avatar']
  size?: 'sm' | 'rg'
}

const ContributorHelp = ({
  triggerContent,
}: {
  triggerContent: string
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger className="text-muted-foreground inline-flex w-fit cursor-default items-center gap-1 text-sm font-medium capitalize">
          {triggerContent}
          <span>
            <CircleHelp size={16} />
          </span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent>
            Contributors are aggregated from metadata on this artifact
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  )
}

export const ContributorAvatar = ({
  avatar,
  size = 'sm',
}: ContributorAvatarProps) => {
  const avatarSize = size === 'sm' ? 'size-6' : 'size-9'

  return (
    <Avatar className={cn(avatarSize)}>
      {avatar && (
        <AvatarImage
          className={cn(
            'rounded-full outline outline-[1px] outline-neutral-200 dark:outline-neutral-700',
            avatarSize,
          )}
          src={avatar}
        />
      )}
      <AvatarFallback
        className={cn(
          'flex aspect-square items-center justify-center',
          avatarSize,
        )}>
        <div className="h-full w-full rounded-full bg-gradient-to-t from-neutral-200 to-neutral-400 dark:from-neutral-500 dark:to-neutral-800" />
      </AvatarFallback>
    </Avatar>
  )
}

export const handleQueryContributor = ({
  contributor,
  updateQuery,
}: {
  contributor: Contributor
  updateQuery: Action['updateQuery']
}) => {
  const v: { type: 'email' | 'name'; value: string } | undefined =
    contributor.email ? { type: 'email', value: contributor.email }
    : contributor.name ? { type: 'name', value: contributor.name }
    : undefined

  if (!v) return

  /** for now we just test if theres a space or a + somewhere */
  const containsUnescapedChars = /[+\s]/.test(v.value)

  const constructedArg =
    containsUnescapedChars ?
      `${v.type}='${v.value}'`
    : `${v.type}=${v.value}`

  const contributorsQuery = `:attr(contributors, [${constructedArg}])`
  updateQuery(contributorsQuery)
}

const Contributor = ({
  contributor,
  size = 'sm',
}: {
  contributor: Contributor
  size?: ContributorAvatarProps['size']
}) => {
  const updateQuery = useGraphStore(state => state.updateQuery)

  return (
    <div
      role="button"
      onClick={() =>
        handleQueryContributor({ contributor, updateQuery })
      }
      className="flex cursor-default gap-2 bg-transparent px-6 py-2 transition-colors duration-250 hover:bg-neutral-100 dark:hover:bg-neutral-800">
      <ContributorAvatar size={size} avatar={contributor.avatar} />
      <div className="text-foreground flex flex-col justify-center text-sm">
        <p className="font-medium text-neutral-900 dark:text-neutral-200">
          {contributor.name}
        </p>
        {contributor.email && (
          <p className="text-muted-foreground text-xs">
            {contributor.email}
          </p>
        )}
      </div>
    </div>
  )
}

export const ContributorTabContent = () => {
  const contributors = useSelectedItemStore(
    state => state.contributors,
  )
  const { setActiveTab } = useTabNavigation()

  const handleBackToOverview = () => setActiveTab('overview')

  if (!contributors || contributors.length <= 0)
    return (
      <SelectedItemEmptyState
        icon={UsersRound}
        title="No contributors"
        description="We couldn't find any contributors for this project"
      />
    )

  return (
    <MotionContent
      {...contentMotion}
      className="flex h-full flex-col">
      <section className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-3 px-6">
          <Button
            onClick={() => handleBackToOverview()}
            className="border-muted text-foreground inline-flex h-fit w-fit items-center gap-1.5 rounded-md border-[1px] bg-transparent px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900">
            <ArrowLeft />
            <span>Back</span>
          </Button>

          <ContributorHelp
            triggerContent={`${contributors.length} contributors`}
          />
        </div>

        <div className="flex flex-col gap-2">
          {contributors.map((contributor, idx) => (
            <Contributor
              size="rg"
              key={`contributor-${idx}`}
              contributor={contributor}
            />
          ))}
        </div>
      </section>
    </MotionContent>
  )
}
