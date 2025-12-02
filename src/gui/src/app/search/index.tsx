import { Link, NavLink } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { Search as SearchPalette } from '@/components/search/search.tsx'
import { CtaWaitlistGrid } from '@/components/call-to-action/waitlist/grid.tsx'
import { Button } from '@/components/ui/button.tsx'
import { VltClient, Vsr } from '@/components/icons/index.ts'
import { FlipWords } from '@/components/ui/text-flip.tsx'
import { FlipButton } from '@/components/ui/flip-button.tsx'
import { FlickeringGrid } from '@/components/ui/flickering-grid.tsx'
import { InstallIllustration } from '@/components/search/illustrations/install.tsx'
import { ServeIllustration } from '@/components/search/illustrations/serve.tsx'
import { DiscoverIllustration } from '@/components/search/illustrations/discover.tsx'
import { ConfigureIllustration } from '@/components/search/illustrations/configure.tsx'
import { useBlogPosts } from '@/lib/blog-posts.tsx'
import { format } from 'date-fns'
import { cn } from '@/lib/utils.ts'

import type { ReactElement } from 'react'
import type { Icon } from '@/components/ui/flip-button.tsx'

const words = [
  'next project',
  'next website',
  'next dev tool',
  'next app',
  'next release',
  'next workflow',
  'next blog',
  'next build',
  'next idea',
  'next integration',
  'next deployment',
  'next creation',
  'next release',
]

interface CardProps {
  title: string
  description: string
  button: {
    icon: Icon
    label: string
    href: string
  }
  illustration?: ReactElement
}

const Card = ({
  title,
  description,
  button,
  illustration,
}: CardProps) => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-[0.5px] xl:aspect-square">
      <div className="bg-background relative flex h-full w-full flex-col gap-4 rounded px-5 pt-5 pb-5 xl:pb-0">
        <div className="order-2 flex grow flex-col gap-2 xl:order-1">
          <h3 className="bg-gradient-to-tr from-neutral-500 to-neutral-900 bg-clip-text text-2xl leading-tight font-medium tracking-tight text-balance text-transparent dark:from-neutral-400 dark:to-neutral-50">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm font-medium">
            {description}
          </p>
          <NavLink to={button.href} className="w-fit">
            <FlipButton
              size="sm"
              icon={button.icon}
              label={button.label}
              className="mt-2 w-fit"
            />
          </NavLink>
        </div>
        {illustration && (
          <div className="mask relative order-1 grow mask-b-from-0% mask-b-to-100% max-xl:h-[100px] xl:order-2 xl:flex-none xl:mask-b-to-90%">
            {illustration}
          </div>
        )}
      </div>
    </div>
  )
}

export const Search = () => {
  const { blogPosts } = useBlogPosts(3)

  return (
    <section className="bg-background">
      <div className="bg-foreground/6 relative">
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <div className="flex w-full justify-center overflow-hidden">
            <div
              className={cn(
                '**:data-grid-content:bg-background grid w-full *:p-[0.5px] **:data-grid-content:h-full **:data-grid-content:rounded',
              )}>
              <div
                aria-hidden
                className="col-span-full grid grid-cols-12 gap-px max-lg:hidden">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square">
                    <div data-grid-content />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-px">
                <div
                  aria-hidden
                  className="grid auto-rows-fr grid-rows-6 gap-px max-lg:hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square">
                      <div data-grid-content />
                    </div>
                  ))}
                </div>

                <div className="bg-background relative col-span-full rounded p-6 lg:col-span-10 lg:p-0">
                  {/* background */}
                  <div className="bg-background absolute inset-0 max-lg:hidden">
                    <div className="**:data-grid-content:bg-background from-foreground/0 to-foreground/6 relative grid w-full grid-cols-10 bg-radial opacity-50 *:p-[0.5px] **:data-grid-content:h-full **:data-grid-content:rounded">
                      {Array.from({ length: 10 }).map((_, idx) =>
                        Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={`${idx}-${i}`}
                            className="aspect-square">
                            <div data-grid-content />
                          </div>
                        )),
                      )}
                    </div>
                  </div>

                  {/* content */}
                  <div className="flex h-full w-full flex-col items-center justify-center gap-10 px-0 text-center xl:px-8">
                    <div className="z-[2] flex w-full flex-col items-center justify-center gap-6">
                      <h1 className="mt-4 bg-gradient-to-tr from-neutral-600 to-neutral-900 bg-clip-text py-1 text-6xl font-medium tracking-tight text-transparent dark:from-neutral-400 dark:to-neutral-100">
                        Discover packages{' '}
                        <span className="max-xl:hidden">
                          for your
                        </span>
                        <br />
                        <FlipWords
                          className="max-xl:hidden"
                          words={words}
                        />
                      </h1>
                      <SearchPalette className="w-2/3 xl:w-[400px]" />
                      <div className="flex flex-wrap gap-2">
                        <NavLink to="https://docs.vlt.sh/cli">
                          <Button size="sm" variant="outline">
                            <VltClient />
                            <span>Install the client</span>
                          </Button>
                        </NavLink>
                        <NavLink to="https://www.vlt.sh/serverless-registry">
                          <Button size="sm" variant="ghost">
                            <Vsr />
                            <span>Managed hosting</span>
                          </Button>
                        </NavLink>
                        <NavLink to="https://docs.vlt.sh/">
                          <Button size="sm" variant="ghost">
                            Documentation
                          </Button>
                        </NavLink>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  aria-hidden
                  className="grid auto-rows-fr grid-rows-6 gap-px max-lg:hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square">
                      <div data-grid-content />
                    </div>
                  ))}
                </div>
              </div>

              <div
                aria-hidden
                className="col-span-full grid grid-cols-12 gap-px max-lg:hidden">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square">
                    <div data-grid-content />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Decorator className="max-lg:hidden" />
        </div>

        {/* features */}
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <div className="flex w-full p-[0.5px]">
            <div className="bg-foreground/3 w-full rounded">
              <div className="grid-cols-4 lg:grid">
                <Card
                  title="Install"
                  description="Install the vlt client."
                  illustration={<InstallIllustration />}
                  button={{
                    label: 'Install the client',
                    icon: 'VltClient',
                    href: 'https://docs.vlt.sh/cli',
                  }}
                />

                <Card
                  title="Serve"
                  description="Spin up your workspace instantly."
                  illustration={<ServeIllustration />}
                  button={{
                    label: 'Learn more',
                    icon: 'Vsr',
                    href: 'https://docs.vlt.sh/registry',
                  }}
                />

                <Card
                  title="Configure"
                  description="Configure your dashboard."
                  illustration={<ConfigureIllustration />}
                  button={{
                    label: 'Documentation',
                    icon: 'Newspaper',
                    href: 'https://docs.vlt.sh/registry/configuring',
                  }}
                />

                <Card
                  title="Discover"
                  description="Explore your projects."
                  illustration={<DiscoverIllustration />}
                  button={{
                    label: 'Dashboard',
                    icon: 'LayoutDashboard',
                    href: '/dashboard',
                  }}
                />
              </div>
            </div>
          </div>
          <Decorator className="max-lg:hidden" />
        </div>

        {/* decorator */}
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <div className="flex w-full p-[0.5px]">
            <div className="bg-background w-full rounded">
              <div className="pattern-hatch h-8 w-full opacity-100 dark:opacity-20" />
            </div>
          </div>
          <Decorator className="max-lg:hidden" />
        </div>

        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <div className="flex w-full p-[0.5px]">
            <div className="bg-background relative flex w-full overflow-hidden rounded">
              <div
                aria-hidden="true"
                className="from-background/20 to-background pointer-events-none absolute inset-0 z-[2] bg-radial"
              />
              <FlickeringGrid
                className="pointer-events-none absolute inset-0 z-[1] h-full w-full mask-radial-to-90% mask-radial-at-center"
                squareSize={4}
                gridGap={6}
                color="#6B7280"
                maxOpacity={0.5}
                flickerChance={0.1}
                height={1920}
                width={1080}
              />
              <div className="z-[3] flex w-full flex-col justify-between px-6 pt-12 pb-6 md:flex-row md:pt-24">
                <div className="flex max-w-full flex-col md:max-w-sm">
                  <h2
                    id="blog-heading"
                    className="tracking-loose mt-4 bg-gradient-to-tr from-neutral-600 to-neutral-900 bg-clip-text text-3xl font-medium text-balance text-transparent dark:from-neutral-400 dark:to-neutral-100">
                    Latest news
                  </h2>
                  <p className="text-muted-foreground mt-2 text-xs font-medium">
                    Our mission has always been to improve the
                    developer experience, and we&apos;re thrilled to
                    be working together on it again
                  </p>
                </div>
                <div className="mt-4 self-start md:mt-0 md:self-end">
                  <NavLink to="/blog">
                    <FlipButton icon="Newspaper" label="See more" />
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
          <Decorator className="max-lg:hidden" />
        </div>

        {/* latest news */}
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <div className="bg-foreground/3 relative overflow-hidden rounded">
            <div className="grid-cols-12 lg:grid">
              {blogPosts.map((post, idx) => (
                <Link
                  to={post.link}
                  key={`test-${idx}`}
                  className="col-span-4 flex p-[0.5px]">
                  <article className="bg-background hover:bg-foreground/1 group/article relative flex h-full w-full flex-col overflow-hidden rounded p-6 transition-colors duration-100">
                    <div className="relative">
                      {/* sides */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 inset-y-0 z-[2] border-x border-dashed"
                      />
                      {/* t + b */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-1/2 z-[2] w-svh -translate-x-1/2 border-y border-dashed"
                      />

                      <img
                        src={post.banner}
                        alt={post.bannerAlt}
                        className="dark:mask z-[2] aspect-video object-cover object-center dark:mask-b-from-80% dark:mask-b-to-100%"
                      />
                      <div
                        aria-hidden
                        className="dark:mask dark:pattern-hatch z-[1] hidden dark:absolute dark:inset-0 dark:block dark:mask-t-from-20% dark:mask-t-to-100%"
                      />
                    </div>
                    <div className="mt-3 flex grow flex-col gap-[0.5px]">
                      <time className="text-muted-foreground font-mono text-[0.7rem] font-medium uppercase tabular-nums">
                        {format(post.date, 'MMMM do, yyyy')}
                      </time>
                      <p className="text-foreground text-md mt-1 leading-tight font-semibold tracking-tight text-balance">
                        {post.title}
                      </p>
                      <p className="text-muted-foreground mt-2 text-xs font-medium">
                        {post.summary}
                      </p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <span
                        className={cn(
                          'text-muted-foreground inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors',
                          'group-hover/article:[&>svg]:translate-x-1',
                          '[&>svg]:ml-auto [&>svg]:size-4 [&>svg]:transition-transform',
                        )}>
                        <span>Read</span>
                        <ChevronRight />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
          <Decorator className="max-lg:hidden" />
        </div>

        {/* decorator */}
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <div className="flex w-full p-[0.5px]">
            <div className="bg-background w-full rounded">
              <div className="pattern-hatch h-8 w-full opacity-100 dark:opacity-20" />
            </div>
          </div>
          <Decorator className="max-lg:hidden" />
        </div>

        {/* waitlist */}
        <div className="grid-cols-[1fr_4fr_1fr] lg:grid">
          <Decorator className="max-lg:hidden" />
          <div className="relative flex w-full overflow-hidden p-[0.5px]">
            <div className="bg-background w-full rounded px-6 py-5">
              <CtaWaitlistGrid />
            </div>
          </div>
          <Decorator className="max-lg:hidden" />
        </div>
      </div>
    </section>
  )
}

const Decorator = ({ className }: { className?: string }) => {
  return (
    <div aria-hidden="true" className={cn('p-[0.5px]', className)}>
      <div className="bg-background h-full rounded" />
    </div>
  )
}
