import { TabsContent } from '@/components/ui/tabs.tsx'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button.tsx'
import {
  ArrowLeft,
  ArrowRight,
  UsersRound,
  CircleHelp,
} from 'lucide-react'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@radix-ui/react-avatar'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { cn } from '@/lib/utils.ts'
import { EmptyState } from '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx'
import {
  Tooltip,
  TooltipPortal,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { useGraphStore } from '@/state/index.ts'

import type { Tab } from '@/components/explorer-grid/selected-item/context.tsx'
import type { Contributor } from '@/lib/external-info.ts'

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
        <TooltipTrigger className="inline-flex w-fit cursor-default items-center gap-1 text-sm font-medium capitalize text-muted-foreground">
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

const ContributorAvatar = ({
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

const Contributor = ({
  contributor: { avatar, name, email },
  size = 'sm',
}: {
  contributor: Contributor
  size?: ContributorAvatarProps['size']
}) => {
  const updateQuery = useGraphStore(state => state.updateQuery)

  const handleQueryContributor = (email: Contributor['email']) =>
    updateQuery(`:attr(contributors, [email=${email}])`)

  return (
    <div
      role="button"
      onClick={() => handleQueryContributor(email)}
      className="duration-250 flex cursor-default gap-2 bg-transparent px-6 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
      <ContributorAvatar size={size} avatar={avatar} />
      <div className="flex flex-col justify-center text-sm text-foreground">
        <p className="font-medium text-neutral-900 dark:text-neutral-200">
          {name}
        </p>
        {email && (
          <p className="text-xs text-muted-foreground">{email}</p>
        )}
      </div>
    </div>
  )
}

export const ContributorList = () => {
  const { query } = useParams<{ query: string; tab: Tab }>()
  const contributors = useSelectedItemStore(
    state => state.contributors,
  )

  if (!contributors || contributors.length === 0) return null

  return (
    <div className="flex cursor-default flex-col gap-2 px-6 pb-4">
      <ContributorHelp triggerContent="Contributors" />
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap items-center -space-x-2">
          {contributors.slice(0, 6).map((contributor, idx) => (
            <ContributorAvatar
              key={`contributor-avatar-${idx}`}
              avatar={contributor.avatar}
            />
          ))}
          {contributors.length > 6 && (
            <div className="flex size-6 items-center justify-center rounded-full bg-background p-0.5 outline outline-[1px] outline-neutral-200 dark:outline-neutral-700">
              <span className="font-mono text-xxs font-medium tabular-nums text-muted-foreground">
                {contributors.length > 99 ?
                  '99+'
                : `+${contributors.length - 6}`}
              </span>
            </div>
          )}
        </div>
        <Button
          className="duration-250 font-muted-foreground h-fit rounded-full border-[1px] border-neutral-200 bg-neutral-100 px-3 py-1.5 text-sm font-normal text-foreground transition-colors hover:border-muted-foreground/20 hover:bg-muted-foreground/15 hover:text-foreground dark:border-[#313131] dark:bg-neutral-800 dark:hover:bg-neutral-700/70"
          variant="default"
          asChild>
          <Link to={`/explore/${query}/contributors`}>
            See all contributors
            <span>
              <ArrowRight size={14} />
            </span>
          </Link>
        </Button>
      </div>
    </div>
  )
}

export const ContributorTabContent = () => {
  const contributors = useSelectedItemStore(
    state => state.contributors,
  )
  const setActiveTab = useSelectedItemStore(
    state => state.setActiveTab,
  )

  const handleBackToOverview = () => setActiveTab('overview')

  if (!contributors || contributors.length <= 0)
    return (
      <EmptyState
        icon={UsersRound}
        message="We couldn't find any contributors for this project"
      />
    )

  return (
    <TabsContent value="contributors">
      <section className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-3 px-6">
          <Button
            onClick={() => handleBackToOverview()}
            className="inline-flex h-fit w-fit items-center gap-1.5 rounded-md border-[1px] border-muted bg-transparent px-3 py-1 text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900">
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
    </TabsContent>
  )
}
