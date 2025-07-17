import { TabsTrigger } from '@/components/ui/tabs.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import Markdown from 'react-markdown'
import {
  FileText,
  Globe,
  Bug,
  RectangleHorizontal,
  Star,
  CircleDot,
  GitPullRequest,
  Link as LucideLink,
} from 'lucide-react'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { Link } from '@/components/ui/link.tsx'
import { toHumanNumber } from '@/utils/human-number.ts'
import { Github } from '@/components/icons/index.ts'
import { getRepositoryUrl } from '@/utils/get-repo-url.ts'
import { ContributorList } from '@/components/explorer-grid/selected-item/tabs-contributors.tsx'
import {
  MotionTabsContent,
  tabMotion,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { cn } from '@/lib/utils.ts'
import { useFocusState } from '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx'
import { getKnownHostname } from '@/utils/get-known-hostname.ts'

import type { NormalizedKeywords } from '@vltpkg/types'

export const OverviewTabButton = () => {
  return (
    <TabsTrigger
      variant="ghost"
      value="overview"
      className="w-fit px-2">
      Overview
    </TabsTrigger>
  )
}

interface AsideEmptyStateProps {
  className?: string
}

export const AsideEmptyState = ({
  className,
}: AsideEmptyStateProps) => {
  return (
    <aside
      className={cn(
        'flex h-72 w-full flex-col items-center justify-center rounded-xl border-[1px] border-muted bg-white px-6 py-4 dark:bg-neutral-900',
        className,
      )}>
      <p className="w-2/3 text-pretty text-center text-sm text-muted-foreground">
        We couldn't create an overview for this project.
      </p>
    </aside>
  )
}

interface TabContentAsideProps {
  className?: string
}

export const TabContentAside = ({
  className,
}: TabContentAsideProps) => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const stargazers = useSelectedItemStore(
    state => state.stargazersCount,
  )
  const openIssue = useSelectedItemStore(
    state => state.openIssueCount,
  )
  const openPR = useSelectedItemStore(
    state => state.openPullRequestCount,
  )
  const { focused } = useFocusState()

  const asideEmpty =
    !stargazers &&
    !openIssue &&
    !openPR &&
    !manifest?.homepage &&
    !manifest?.repository &&
    !manifest?.bugs &&
    !manifest?.funding

  if (asideEmpty && !focused) return null

  if (asideEmpty && focused) return <AsideEmptyState />

  return (
    <aside
      className={cn(
        'order-1 flex cursor-default flex-col gap-4 px-6 py-4 xl:order-2 xl:col-span-4',
        className,
      )}>
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium capitalize text-muted-foreground">
          about
        </h4>
        <div className="flex flex-col gap-2">
          {manifest?.homepage && (
            <Link
              href={manifest.homepage}
              className="text-sm text-foreground">
              <span className="flex items-center justify-center">
                <Globe size={16} className="text-muted-foreground" />
              </span>
              <span>Website</span>
            </Link>
          )}
          {manifest?.repository && (
            <Link
              href={
                getRepositoryUrl(manifest.repository) ?? undefined
              }
              className="text-sm text-foreground">
              <span className="flex w-4 items-center justify-center">
                <Github size={16} className="text-muted-foreground" />
              </span>
              <span>Repository</span>
            </Link>
          )}
          {manifest?.bugs &&
            (() => {
              let href: string | null = null

              if (typeof manifest.bugs === 'string') {
                href = manifest.bugs
              } else if (
                'url' in manifest.bugs &&
                manifest.bugs.url
              ) {
                href = manifest.bugs.url
              } else if (
                'email' in manifest.bugs &&
                manifest.bugs.email
              ) {
                href = `mailto:${manifest.bugs.email}`
              }

              return href ?
                  <Link
                    href={href}
                    className="text-sm text-foreground">
                    <span className="flex items-center justify-center">
                      <Bug
                        size={16}
                        className="text-muted-foreground"
                      />
                    </span>
                    <span>Bug reports</span>
                  </Link>
                : null
            })()}
          {openPR && (
            <div className="flex items-center gap-2">
              <GitPullRequest
                size={16}
                className="text-muted-foreground"
              />
              <div className="flex gap-1">
                <DataBadge variant="count" content={openPR} />
                <p className="text-sm">Pull requests</p>
              </div>
            </div>
          )}
          {openIssue && (
            <div className="flex items-center gap-2">
              <CircleDot
                size={16}
                className="text-muted-foreground"
              />
              <div className="flex gap-1">
                <DataBadge variant="count" content={openIssue} />
                <p className="text-sm">Issues</p>
              </div>
            </div>
          )}
          {(stargazers ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <Star size={16} className="text-muted-foreground" />
              <div className="flex gap-1">
                <DataBadge
                  variant="count"
                  content={toHumanNumber(stargazers ?? 0)}
                />
                <p className="text-sm">Stars</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {manifest?.funding && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium capitalize text-muted-foreground">
            funding
          </h4>
          <div className="flex flex-col gap-2">
            {(() => {
              const entries =
                Array.isArray(manifest.funding) ?
                  manifest.funding
                : [manifest.funding]

              return entries.map((entry, idx) => {
                const url =
                  typeof entry === 'string' ? entry : entry.url
                if (!url) return null

                return (
                  <Link
                    key={`${url}-${idx}`}
                    href={url}
                    className="text-sm text-foreground">
                    <span className="flex items-center justify-center text-muted-foreground">
                      <LucideLink size={16} />
                    </span>
                    <span>{getKnownHostname(url) ?? 'Website'}</span>
                  </Link>
                )
              })
            })()}
          </div>
        </div>
      )}
    </aside>
  )
}

export const OverviewTabContent = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const { focused } = useFocusState()

  const keywords = manifest?.keywords as
    | NormalizedKeywords
    | undefined

  return (
    <MotionTabsContent
      {...tabMotion}
      value="overview"
      className="divide-x-none group flex grid-cols-12 flex-col divide-muted xl:grid xl:divide-x-[1px] [&>aside]:border-b-[1px] [&>aside]:border-red-500 xl:[&>aside]:border-b-[0px]">
      <div className="order-2 flex flex-col gap-4 xl:order-1 xl:col-span-12 xl:group-[&:has(aside)]:col-span-8">
        {manifest?.description ?
          <div className="flex flex-col gap-2 px-6 py-4">
            <h4 className="text-sm font-medium capitalize text-muted-foreground">
              description
            </h4>
            <div className="prose-sm prose-neutral max-w-none text-sm">
              <Markdown>{manifest.description}</Markdown>
            </div>
          </div>
        : <EmptyState />}

        <ContributorList />

        {keywords && (
          <div className="flex grow flex-col justify-end gap-2 px-6 pb-4">
            <h4 className="text-sm font-medium capitalize text-muted-foreground">
              keywords
            </h4>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, idx) => (
                <DataBadge
                  classNames={{
                    wrapperClassName: 'inline-flex h-fit',
                  }}
                  key={`${keyword}-${idx}`}
                  content={keyword}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {!focused && <TabContentAside />}
    </MotionTabsContent>
  )
}

const EmptyState = () => {
  return (
    <div className="flex h-64 w-full items-center justify-center px-6 py-4">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative flex size-32 items-center justify-center rounded-full bg-secondary/60">
          <RectangleHorizontal
            className="absolute z-[2] mt-3 size-9 -translate-x-4 -rotate-[calc(90deg+30deg)] fill-secondary text-muted-foreground/50"
            strokeWidth={1.25}
          />
          <FileText
            className="absolute z-[3] size-14 fill-secondary text-neutral-500"
            strokeWidth={1}
          />
          <RectangleHorizontal
            className="absolute z-[2] mt-3 size-9 translate-x-4 rotate-[calc(90deg+30deg)] fill-secondary text-muted-foreground/50"
            strokeWidth={1.25}
          />
        </div>
        <p className="w-2/3 text-pretty text-sm text-muted-foreground">
          We couldn't find a description for this project.
        </p>
      </div>
    </div>
  )
}
