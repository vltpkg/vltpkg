import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils.ts'

import type { Post } from '@/lib/blog-posts.tsx'

const MotionLink = motion.create(Link)

interface BlogPostProps extends Post {
  classNames?: {
    bannerCn?: string
    wrapperCn?: string
  }
  isFeatured?: boolean
}

export const BlogPost = forwardRef<HTMLAnchorElement, BlogPostProps>(
  (
    {
      title,
      date,
      classNames,
      banner,
      bannerAlt,
      summary,
      slug,
      isFeatured = false,
    },
    ref,
  ) => {
    const { bannerCn, wrapperCn } = classNames ?? {}

    return (
      <MotionLink
        ref={ref}
        to={slug}
        target="_blank"
        className={cn(
          'group/blog-post flex cursor-default flex-col',
          wrapperCn,
        )}
        whileHover="hover"
        initial="initial">
        <article className="flex flex-col">
          <div
            className={cn(
              'relative aspect-video overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-900',
              bannerCn,
            )}>
            <motion.img
              src={banner}
              alt={bannerAlt}
              variants={{
                initial: { scale: 1 },
                hover: { scale: 1.05 },
              }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div
            className={cn(
              isFeatured ?
                'mb-3 mt-4 flex flex-col gap-2'
              : 'mb-1 mt-3',
            )}>
            <p className={cn('text-md', isFeatured && 'text-2xl')}>
              {title}
            </p>
            {isFeatured && (
              <p className="w-full !text-lg text-muted-foreground md:w-2/3">
                {summary}
              </p>
            )}
          </div>
          <div className="inline-flex items-center">
            <p
              className={cn(
                'text-sm text-muted-foreground',
                isFeatured && 'text-md',
              )}>
              {format(date, 'LLL do, yyyy')}
            </p>
          </div>
        </article>
      </MotionLink>
    )
  },
)

BlogPost.displayName = 'BlogPost'
