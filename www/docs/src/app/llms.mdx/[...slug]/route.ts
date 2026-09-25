import { notFound } from 'next/navigation'
import { pageMarkdown, source } from '@/lib/source'

export const generateStaticParams = () => source.generateParams()

// reached through the `/:path+.md` rewrite in next.config.ts
export const GET = async (
  _request: Request,
  { params }: RouteContext<'/llms.mdx/[...slug]'>,
) => {
  const page = source.getPage((await params).slug)
  if (!page) notFound()
  return new Response(await pageMarkdown(page), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
