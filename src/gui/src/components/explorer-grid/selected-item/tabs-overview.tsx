import { TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
import Markdown from 'react-markdown'
import {
  FileText,
  Globe,
  HeartHandshake,
  Bug,
  RectangleHorizontal,
} from 'lucide-react'
import { InlineCode } from '@/components/ui/inline-code.jsx'
import { Link } from '@/components/ui/link.jsx'
import { cn } from '@/lib/utils.js'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@radix-ui/react-avatar'
import type { Contributor } from '@/lib/external-info.js'

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

export const OverviewTabContent = () => {
  const manifest = useSelectedItemStore(state => state.manifest)

  return (
    <TabsContent value="overview" className="flex flex-col gap-4">
      <div
        className={cn(
          'flex flex-wrap gap-4 px-6 pt-4',
          !manifest?.homepage && !manifest?.funding && 'hidden',
        )}>
        {manifest?.homepage && (
          <div className="flex flex-col gap-1">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe size={16} className="text-blue-500" />
              <span>Homepage</span>
            </p>
            <Link href={manifest.homepage} className="text-sm">
              {manifest.homepage}
            </Link>
          </div>
        )}
        {manifest?.funding && (
          <div className="flex flex-col gap-1">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <HeartHandshake size={16} className="text-rose-400" />
              <span>Funding</span>
            </p>
            {Array.isArray(manifest.funding) ?
              manifest.funding.map((entry, idx) =>
                typeof entry === 'string' ?
                  <Link
                    className="text-sm"
                    key={`${entry}-${idx}`}
                    href={entry}>
                    {entry}
                  </Link>
                : <Link
                    className="text-sm"
                    key={idx}
                    href={entry.url}>
                    {entry.url}
                  </Link>,
              )
            : typeof manifest.funding === 'string' ?
              <Link href={manifest.funding} className="text-sm">
                {manifest.funding}
              </Link>
            : <Link href={manifest.funding.url} className="text-sm">
                {manifest.funding.url}
              </Link>
            }
          </div>
        )}
        {manifest?.bugs && (
          <div className="flex flex-col gap-1">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Bug size={16} className="text-red-500" />
              <span>Bug Reports</span>
            </p>
            {typeof manifest.bugs === 'string' ?
              <Link href={manifest.bugs} className="text-sm">
                {manifest.bugs}
              </Link>
            : 'url' in manifest.bugs && manifest.bugs.url ?
              <Link href={manifest.bugs.url} className="text-sm">
                {manifest.bugs.url}
              </Link>
            : 'email' in manifest.bugs && manifest.bugs.email ?
              <Link
                href={`mailto:${manifest.bugs.email}`}
                className="text-sm">
                {manifest.bugs.email}
              </Link>
            : null}
          </div>
        )}
      </div>

      {manifest?.description ?
        <div className="flex flex-col gap-2 px-6 py-4">
          <h4 className="text-sm font-medium capitalize">
            description
          </h4>
          <div className="prose-sm prose-neutral max-w-none text-sm">
            <Markdown>{manifest.description}</Markdown>
          </div>
        </div>
      : <div className="flex h-64 w-full items-center justify-center px-6 py-4">
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
      }

      <ContributorList />

      {manifest?.keywords && (
        <div className="flex cursor-default flex-col gap-2 px-6 pb-4">
          <h4 className="text-sm font-medium capitalize">keywords</h4>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(manifest.keywords) ?
              manifest.keywords.map((keyword, idx) => (
                <InlineCode
                  variant="mono"
                  key={`${keyword}-${idx}`}
                  className={cn(
                    'mx-0 inline-flex cursor-default items-center pt-1.5',
                  )}>
                  {keyword}
                </InlineCode>
              ))
            : typeof manifest.keywords === 'string' ?
              (manifest.keywords as string)
                .split(', ')
                .map((keyword: string, idx: number) => (
                  <InlineCode
                    variant="mono"
                    key={`${keyword}-${idx}`}
                    className={cn(
                      'mx-0 inline-flex cursor-default items-center pt-1.5',
                    )}>
                    {keyword}
                  </InlineCode>
                ))
            : null}
          </div>
        </div>
      )}
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
      <h4 className="text-sm font-medium capitalize">Contributors</h4>
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
