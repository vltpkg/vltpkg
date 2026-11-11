import { createLlmsFullHandler } from '@affordances/md/next'
import { source } from '@/lib/source'
import { skills } from '@/lib/skills'

// every docs page sits behind [...slug], which the plugin's own route list leaves out, so name them here;
// the ~100 typedoc pages would swamp this file, and llms.txt still lists them
const pages = () =>
  source
    .getPages()
    .map(page => page.url)
    .filter(url => !url.startsWith('/client/api-reference'))

const full = createLlmsFullHandler({
  pages,
  // the agent skills, headed `# Title (url)` like the pages
  append: request =>
    skills
      .map(({ url, content }) =>
        content.replace(
          /^# (.+)/,
          `# $1 (${new URL(url, request.url).href})`,
        ),
      )
      .join('\n\n'),
  // a 503 is never stored, so serving a stale copy while it renders again is safe
  publicCache: 'hours',
})

// the plugin 503s on a failed render, but takes a 401/403 (a protected preview, a firewall) as a page left out
// by design; an incomplete file must not be cached as if it were the whole site, so check each page made it
export const GET = async (request: Request) => {
  const res = await full(request)
  if (res.status !== 200) return res
  const body = await res.text()
  const missing = pages().filter(
    path => !body.includes(` (${new URL(path, request.url).href})\n`),
  )
  if (!missing.length) return new Response(body, res)
  return new Response(
    `llms-full.txt is incomplete: ${missing.length} of ${pages().length} pages couldn't be rendered. Try again shortly. Missing: ${missing.join(', ')}\n`,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '60',
      },
    },
  )
}
