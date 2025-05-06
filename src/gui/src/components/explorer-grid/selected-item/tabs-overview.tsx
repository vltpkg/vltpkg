import { TabsTrigger, TabsContent } from '@/components/ui/tabs.tsx'
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
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@radix-ui/react-avatar'
import { toHumanNumber } from '@/utils/human-number.ts'
import { Github } from '@/components/icons/index.ts'
import { getRepositoryUrl } from '@/utils/get-repo-url.ts'
import type { Contributor } from '@/lib/external-info.ts'

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

const getSiteName = (url: string): string | undefined => {
  return new URL(url).hostname.replace(/^www\./, '').split('.')[0]
}

const TabContentAside = () => {
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

  const asideEmpty =
    !stargazers &&
    !openIssue &&
    !openPR &&
    !manifest?.homepage &&
    !manifest?.repository &&
    !manifest?.bugs &&
    !manifest?.funding

  if (asideEmpty) return null

  return (
    <aside className="order-1 flex cursor-default flex-col gap-4 px-6 py-4 xl:order-2 xl:col-span-4">
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
              <span>{getSiteName(manifest.homepage)}</span>
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
                    <span>{getSiteName(url)}</span>
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

  const keywords =
    manifest?.keywords ?
      Array.isArray(manifest.keywords) ? manifest.keywords
      : typeof manifest.keywords === 'string' ?
        (manifest.keywords as string).split(', ')
      : []
    : []

  return (
    <TabsContent
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

        {manifest?.keywords && (
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
      <TabContentAside />
    </TabsContent>
  )
}

const Contributor = ({
  contributor: { name, email, avatar },
}: {
  contributor: Contributor
}) => {
  return (
    <div className="flex cursor-default gap-2">
      <Avatar className="size-9">
        {avatar && (
          <AvatarImage
            className="size-9 rounded-full outline outline-[1px] outline-neutral-200 dark:outline-neutral-700"
            src={avatar}
          />
        )}
        <AvatarFallback className="flex aspect-square size-9 items-center justify-center">
          <div className="h-full w-full rounded-full bg-gradient-to-t from-neutral-200 to-neutral-400 dark:from-neutral-500 dark:to-neutral-800" />
        </AvatarFallback>
      </Avatar>
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

const ContributorList = () => {
  const contributors = useSelectedItemStore(
    state => state.contributors,
  )

  if (!contributors?.length) return null

  return (
    <div className="flex cursor-default flex-col gap-2 px-6 pb-4">
      <h4 className="text-sm font-medium capitalize text-muted-foreground">
        Contributors
      </h4>
      <div className="flex flex-wrap gap-x-8 gap-y-5">
        {contributors.map((contributor, idx) => (
          <Contributor
            key={`contributor-${idx}`}
            contributor={contributor}
          />
        ))}
      </div>
    </div>
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
          We couldn't find a description for this project
        </p>
      </div>
    </div>
  )
}
