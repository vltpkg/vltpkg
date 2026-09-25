import type { Metadata } from 'next'
import { Fragment, Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { breadcrumbs, pageTitle, source } from '@/lib/source'
import { components } from '@/mdx-components'
import { Toc, TocBar } from '@/components/toc'
import { PageNav } from '@/components/page-nav'
import { CopyPage } from '@/components/copy-page'
import { TextSelection } from '@/components/text-selection'
import { ScrollToTop } from '@/components/scroll-to-top'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export const generateStaticParams = () => source.generateParams()

export const generateMetadata = async ({
  params,
}: PageProps<'/[...slug]'>): Promise<Metadata> => {
  const page = source.getPage((await params).slug)
  if (!page) notFound()
  const title = pageTitle(page)
  // pages without frontmatter descriptions would otherwise drop the site one entirely
  const description =
    page.data.description ??
    'Documentation for the vlt client and the vlt registry.'
  const image = {
    url: `/og${page.url}`,
    width: 1200,
    height: 630,
    alt: title,
  }
  return {
    title,
    description,
    alternates: { canonical: page.url },
    openGraph: {
      type: 'article',
      siteName: 'vlt docs',
      url: page.url,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

// same as the old site's Starlight `editLink`; typedoc pages are generated (and gitignored), so they get none
const editUrl = (path: string, url: string) =>
  url.startsWith('/client/api-reference') ? undefined : (
    `https://github.com/vltpkg/vltpkg/edit/main/www/docs/content/${path}`
  )

// the App Shell is shared by every docs URL, so the slug read has to sit behind Suspense;
// the layout's navbar and sidebar paint instantly and the page streams in
const Page = ({ params }: PageProps<'/[...slug]'>) => (
  <Suspense>
    <DocPage params={params} />
  </Suspense>
)

const DocPage = async ({
  params,
}: Pick<PageProps<'/[...slug]'>, 'params'>) => {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()

  const MDX = page.data.body
  // top-level pages (why-vlt, use-cases, …) have no trail beyond themselves, so they show none
  const trail = breadcrumbs(page.url)
  // the rail pins to the right edge; the article centres in whatever space is left of it
  return (
    <div className="grid gap-x-16 xl:grid-cols-[minmax(0,1fr)_auto]">
      {/* the wrapper is the toc bar's sticky range (a grid item alone only sticks within its own row);
          --toc-bar takes the bar's h-12 off the column's min-height below */}
      <div className="min-w-0 max-xl:has-[[data-toc-bar]]:[--toc-bar:--spacing(12)]">
        <TocBar toc={page.data.toc} />
        <div aria-hidden className="page-fade page-fade-top" />
        {/* at least one screen tall (minus the navbar, the toc bar and the inset's py-8 / md:py-12), so on short pages
          the pagination's mt-auto pushes it to the bottom of the viewport instead of hugging the text */}
        <div className="mx-auto flex min-h-[calc(100svh-var(--header-height)-4rem-var(--toc-bar,0px))] w-full max-w-[37em] min-w-0 flex-col md:min-h-[calc(100svh-var(--header-height)-6rem-var(--toc-bar,0px))]">
          {trail.length > 1 && (
            <Breadcrumb className="font-pixel mb-8">
              <BreadcrumbList>
                {trail.map((item, i) => (
                  <Fragment key={i}>
                    {i > 0 && (
                      <BreadcrumbSeparator>/</BreadcrumbSeparator>
                    )}
                    <BreadcrumbItem>
                      {i === trail.length - 1 ?
                        <BreadcrumbPage>{item.name}</BreadcrumbPage>
                      : item.url ?
                        <BreadcrumbLink asChild>
                          <Link href={item.url}>{item.name}</Link>
                        </BreadcrumbLink>
                      : item.name}
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <article className="typeset typeset-docs">
            <div className="flex items-start justify-between gap-4">
              {/* min-w-0 + anywhere-wrapping: long unbroken titles (@vltpkg/package-json) otherwise push Copy page off-screen */}
              <h1 className="min-w-0 [overflow-wrap:anywhere]">
                {page.data.title}
              </h1>
              <CopyPage url={page.url} />
            </div>
            {page.data.description && (
              <p className="text-muted-foreground mt-4 text-base leading-[1.6]">
                {page.data.description}
              </p>
            )}
            <MDX
              components={{
                ...components,
                a: ({ href = '', children }) => {
                  // typedoc emits bare relative links (`foo.md`), fumadocs only resolves `./` or `../`
                  const relative =
                    /^[./#]|:/.test(href) ? href : `./${href}`
                  return (
                    <a href={source.resolveHref(relative, page)}>
                      {children}
                    </a>
                  )
                },
              }}
            />
          </article>
          {/* pt-16 keeps the old minimum gap on long pages */}
          <div className="mt-auto pt-16">
            <PageNav url={page.url} />
          </div>
        </div>
        <div aria-hidden className="page-fade page-fade-bottom" />
      </div>
      <TextSelection />
      {/* sit under the sticky navbar rather than the viewport top, and under the toc bar (h-12) below xl;
          z-30 lets the open toc panel (z-40), the navbar menus and the sheet cover it */}
      <ScrollToTop className="top-[calc(var(--header-height)+4rem)] z-30 xl:top-[calc(var(--header-height)+1rem)]" />
      <div className="hidden xl:block">
        <Toc
          toc={page.data.toc}
          editUrl={editUrl(page.path, page.url)}
        />
      </div>
    </div>
  )
}

export default Page
