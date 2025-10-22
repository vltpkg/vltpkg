import { useBlogPosts } from '@/lib/blog-posts.tsx'
import { splitArray } from '@/utils/split-array.ts'
import { BlogPost } from '@/components/blog/post.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'

type RecentBlogPosts = ComponentProps<'div'>

export const RecentBlogPosts = ({
  className,
  ...restProps
}: RecentBlogPosts) => {
  const { blogPosts } = useBlogPosts(4)
  const [featured, restPosts] = splitArray(blogPosts, 1)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-sm font-medium text-muted-foreground">
        Latest news
      </p>
      <section
        className="flex flex-col gap-6 md:grid md:grid-cols-12"
        {...restProps}>
        <div className="z-10 md:sticky md:top-20 md:col-span-6 md:self-start lg:col-span-9">
          {featured.map((featured, idx) => (
            <BlogPost
              key={`featured-post-${idx}`}
              {...featured}
              isFeatured
            />
          ))}
        </div>
        <div className="flex flex-col gap-6 md:col-span-6 md:gap-6 lg:col-span-3">
          {restPosts.map((article, idx) => (
            <BlogPost key={`featured-sub-post-${idx}`} {...article} />
          ))}
        </div>
      </section>
    </div>
  )
}
