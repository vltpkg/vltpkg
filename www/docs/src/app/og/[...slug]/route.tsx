import { notFound } from 'next/navigation'
import { pageTitle, source } from '@/lib/source'
import { ogImage } from '@/lib/og'

// opengraph-image.tsx can't sit under the [...slug] catch-all, so page images live here
export const generateStaticParams = () => source.generateParams()

export const GET = async (
  _request: Request,
  { params }: RouteContext<'/og/[...slug]'>,
) => {
  const page = source.getPage((await params).slug)
  if (!page) notFound()
  return ogImage(pageTitle(page))
}
