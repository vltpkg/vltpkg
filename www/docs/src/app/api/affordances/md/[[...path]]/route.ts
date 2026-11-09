import { GET as md, mdPagePath } from '@affordances/md/next'
import { source } from '@/lib/source'
import { siteUrl } from '@/lib/site-url'
import { GET as llmsTxt } from '@/app/llms.txt/route'

const abs = (path: string) => new URL(path, siteUrl).href

const markdown = (body: BodyInit | null, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
    },
  })

// every page's markdown twin, converted from its html by @affordances/md, reached through withMd's rewrites
export const GET = async (request: Request) => {
  const path = mdPagePath(new URL(request.url).pathname)
  // the homepage is cards and links, so its markdown is the llms.txt index
  if (path === '/') return markdown((await llmsTxt()).body)
  const res = await md(request)
  // the html 404 streams as a 200, so the plugin can't tell it apart; answer with a body agents can act on.
  // files (llms.txt, sitemap.xml) and redirects come back as they are
  if (
    res.status !== 200 ||
    !res.headers.get('content-type')?.startsWith('text/markdown') ||
    source.getPage(path.slice(1).split('/'))
  )
    return res
  await res.body?.cancel()
  return markdown(
    `# 404: Page not found\n\nThere is no page at \`${path}\` on the vlt docs.\n\n- [llms.txt](${abs('/llms.txt')}) lists every page, each available as Markdown\n- [sitemap.xml](${abs('/sitemap.xml')}) lists every URL\n- [Home](${abs('/')})\n`,
    404,
  )
}
