import { SearchBar } from '@/components/search/search-bar.tsx'
import { FeaturedButton } from '@/components/search/featured-button.tsx'
import { RecentBlogPosts } from '@/components/blog/recent-posts.tsx'

import type { FeaturedButtonOptions } from '@/components/search/featured-button.tsx'

const options: FeaturedButtonOptions[] = [
  {
    href: 'https://vlt.sh/products/client',
    label: 'Install the client',
    variant: 'external',
    hostedOnly: true,
  },
  {
    href: 'https://vlt.sh/products/client',
    label: 'Managed hosting',
    variant: 'primary',
  },
  {
    href: 'https://docs.vlt.sh',
    label: 'Documentation',
    variant: 'external',
  },
]

export const Search = () => {
  return (
    <section className="flex flex-col items-center justify-center gap-4">
      <div className="relative mt-[64px] flex h-[calc(100svh-80px-64px)] w-full flex-col items-center justify-center">
        <h1 className="absolute z-[1] mb-52 whitespace-pre-line bg-gradient-to-b from-neutral-700 to-neutral-400 bg-clip-text text-center text-7xl tracking-tight text-transparent md:mb-36 dark:from-neutral-200 dark:to-neutral-500">{`Build for the future\nof JavaScript *`}</h1>
        <SearchBar className="z-[3]" />
        <div className="bg-gradient-radial absolute z-[2] h-14 w-[25rem] rounded-full from-white to-white/10 blur-md dark:from-neutral-950 dark:to-neutral-950/10" />
        <div className="absolute mt-24 flex scale-90 items-center gap-4">
          {options.map((option, idx) => (
            <FeaturedButton
              key={`search-featured-button-${idx}`}
              {...option}
            />
          ))}
        </div>
      </div>

      <RecentBlogPosts className="z-[2] -mt-64 px-8" />
    </section>
  )
}
