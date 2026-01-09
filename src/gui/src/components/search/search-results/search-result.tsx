import {
  forwardRef,
  useState,
  useEffect,
  Fragment,
  memo,
  useMemo,
} from 'react'
import { NavLink } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  format,
  differenceInDays,
  formatDistanceToNow,
} from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { Scale, Download, Dot } from 'lucide-react'
import { getPackageIcon } from '@/utils/get-package-icon.ts'
import { retrieveAvatar } from '@/lib/external-info.ts'
import { toHumanNumber } from '@/utils/human-number.ts'
import { getPackageShortName } from '@/utils/get-package-shortname.ts'

import type { ComponentProps } from 'react'
import type { MotionProps } from 'framer-motion'
import type { SearchObject } from '@/lib/package-search.ts'

interface SearchResultProps extends ComponentProps<'a'> {
  item: SearchObject
  isSelected?: boolean
}

const packageImageMotion: MotionProps = {
  initial: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  transition: {
    duration: 0.1,
    ease: 'easeOut',
  },
}

const SearchResultComponent = forwardRef<
  HTMLAnchorElement,
  SearchResultProps
>(({ item, className, ...props }, ref) => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false)
  const [publisherAvatar, setPublisherAvatar] = useState<
    string | null
  >(null)
  const [publisherAvatarLoaded, setPublisherAvatarLoaded] =
    useState<boolean>(false)
  const { package: pkg } = item

  // Memoize all derived values to avoid recalculation on every render
  const derivedValues = useMemo(() => {
    const packageIcon = getPackageIcon(pkg.links.repository)
    const packageShortName = getPackageShortName(pkg.name)
    const publisherNameShort =
      pkg.publisher?.username ?
        pkg.publisher.username.substring(0, 2)
      : '?'

    let formattedDate = ''
    if (pkg.date) {
      const publishDate = new Date(pkg.date)
      const daysDiff = differenceInDays(new Date(), publishDate)

      if (daysDiff < 14) {
        formattedDate = `${formatDistanceToNow(publishDate, { addSuffix: false })} ago`
      } else {
        formattedDate = format(publishDate, 'MMM d, yyyy')
      }
    }

    return {
      packageIcon,
      packageShortName,
      publisherNameShort,
      formattedDate,
    }
  }, [
    pkg.links.repository,
    pkg.name,
    pkg.publisher?.username,
    pkg.date,
  ])

  // Fetch avatar only once when component mounts or email changes
  useEffect(() => {
    const email = pkg.publisher?.email
    if (email) {
      let cancelled = false
      void retrieveAvatar(email).then(avatar => {
        if (!cancelled) {
          setPublisherAvatar(avatar)
        }
      })
      return () => {
        cancelled = true
      }
    }
  }, [pkg.publisher?.email])

  return (
    <NavLink
      aria-label={`Package ${pkg.name}`}
      ref={ref}
      to={`/explore/npm/${encodeURIComponent(pkg.name)}`}
      className="h-fit w-full"
      {...props}>
      <article className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {derivedValues.packageIcon?.src ?
            <div className="relative size-6 rounded-md border">
              <AnimatePresence mode="popLayout">
                {!imageLoaded && (
                  <motion.div
                    key="package-skeleton"
                    {...packageImageMotion}
                    className="absolute inset-0 flex items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </motion.div>
                )}

                <motion.img
                  key="package-image"
                  {...packageImageMotion}
                  aria-label="Package image"
                  onLoad={() => setImageLoaded(true)}
                  src={derivedValues.packageIcon.src}
                  alt={derivedValues.packageIcon.alt}
                  className="absolute inset-0 size-full rounded-md object-cover"
                />
              </AnimatePresence>
            </div>
          : <div className="flex aspect-square size-6 items-center justify-center rounded-md border bg-linear-to-tr from-neutral-300 to-neutral-100 dark:from-neutral-900 dark:to-neutral-700">
              <span className="bg-linear-to-tr from-neutral-500 to-neutral-900 bg-clip-text text-sm text-transparent empty:hidden dark:from-neutral-400 dark:to-neutral-100">
                {derivedValues.packageShortName}
              </span>
            </div>
          }
          <h3 className="inline-block truncate align-baseline text-lg font-medium tracking-tight">
            {pkg.name}
            <span className="text-muted-foreground ml-2 font-mono text-sm font-medium tabular-nums">
              {pkg.version}
            </span>
          </h3>
        </div>
        {/* description */}
        {pkg.description && (
          <p className="text-foreground text-sm">{pkg.description}</p>
        )}

        {/* tags */}
        {pkg.keywords && pkg.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pkg.keywords.map((keyword, idx) => (
              <span
                key={`${pkg.name}-keyword-${keyword}-${idx}`}
                className="bg-primary/6 ring-primary/3 border-px rounded px-2 text-sm font-medium text-neutral-500 ring-[1px]">
                {keyword}
              </span>
            ))}
          </div>
        )}

        {/* metadata */}
        <div className="**:data-[slot=delimiter]:text-muted-foreground flex items-center gap-1 overflow-x-auto whitespace-nowrap **:data-[slot=delimiter]:size-5">
          <div className="flex items-center gap-1">
            {publisherAvatar ?
              <div className="relative size-4 rounded border">
                <AnimatePresence mode="popLayout">
                  {!publisherAvatarLoaded && (
                    <motion.div
                      key="avatar-skeleton"
                      {...packageImageMotion}
                      className="absolute inset-0 flex items-center justify-center">
                      <Skeleton className="h-full w-full" />
                    </motion.div>
                  )}

                  <motion.img
                    key="avatar-image"
                    {...packageImageMotion}
                    aria-label="Avatar image"
                    onLoad={() => setPublisherAvatarLoaded(true)}
                    src={publisherAvatar}
                    alt={
                      pkg.publisher?.username ?
                        pkg.publisher.username
                      : 'Unknown publisher'
                    }
                    className="absolute inset-0 size-full rounded object-cover"
                  />
                </AnimatePresence>
              </div>
            : <div className="flex aspect-square size-4 items-center justify-center rounded border bg-linear-to-tr from-neutral-300 to-neutral-100 dark:from-neutral-900 dark:to-neutral-700">
                <span className="bg-linear-to-tr from-neutral-500 to-neutral-900 bg-clip-text text-sm text-transparent empty:hidden dark:from-neutral-400 dark:to-neutral-100">
                  {derivedValues.publisherNameShort}
                </span>
              </div>
            }
            <p className="text-sm font-medium">
              {pkg.publisher?.username ?
                pkg.publisher.username
              : 'Unknown publisher'}
            </p>
          </div>
          <Dot data-slot="delimiter" />
          <p className="text-muted-foreground text-sm font-medium">
            {derivedValues.formattedDate}
          </p>
          {pkg.license && (
            <Fragment>
              <Dot data-slot="delimiter" />
              <div className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                <Scale className="size-3.5" />
                <p>{pkg.license}</p>
              </div>
            </Fragment>
          )}
          <Dot data-slot="delimiter" />
          <div className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
            <Download className="size-3.5" />
            <p>{toHumanNumber(item.downloads.monthly)}</p>
          </div>
        </div>
      </article>
    </NavLink>
  )
})

SearchResultComponent.displayName = 'SearchResult'

export const SearchResult = memo(SearchResultComponent)
