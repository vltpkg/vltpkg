import { pageMarkdown, source } from '@/lib/source'
import { siteUrl } from '@/lib/site-url'
import { GET as llmsTxt } from '@/app/llms.txt/route'

// the empty slug is the homepage's markdown twin
export const generateStaticParams = () => [
  { slug: [] },
  ...source.generateParams(),
]

// `Vary` because the same url serves html to browsers
const markdown = (body: BodyInit | null, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
    },
  })

const abs = (path: string) => new URL(path, siteUrl).href

// reached through the `Accept: text/markdown` and `/:path+.md` rewrites in next.config.ts
export const GET = async (
  _request: Request,
  { params }: RouteContext<'/llms.mdx/[[...slug]]'>,
) => {
  const { slug } = await params
  // the homepage is cards and links, so its markdown is the llms.txt index
  if (!slug?.length) return markdown((await llmsTxt()).body)
  const page = source.getPage(slug)
  // a body agents can act on; `notFound()` would send an empty one
  if (!page)
    return markdown(
      `# 404: Page not found\n\nThere is no page at \`/${slug.join('/')}\` on the vlt docs.\n\n- [llms.txt](${abs('/llms.txt')}) lists every page, each available as Markdown\n- [sitemap.xml](${abs('/sitemap.xml')}) lists every URL\n- [Home](${abs('/')})\n`,
      404,
    )
  return markdown(await pageMarkdown(page))
}
