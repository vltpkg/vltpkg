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

const full = createLlmsFullHandler({ pages })

// the plugin has no `append`, so the agent skills go after its pages, headed `# Title (url)` like them
export const GET = async (request: Request) => {
  const res = await full(request)
  const body = await res.text()
  const skillTexts = skills.map(({ url, content }) =>
    content.replace(
      /^# (.+)/,
      `# $1 (${new URL(url, request.url).href})`,
    ),
  )
  const text = `${body}\n${skillTexts.join('\n\n')}\n`
  // a page whose self-fetch failed is silently left out, so check each one made it (headed `# Title (url)`);
  // an incomplete file must not be cached as if it were the whole site
  const missing = pages().filter(
    path => !body.includes(` (${new URL(path, request.url).href})\n`),
  )
  if (!missing.length) return new Response(text, res)
  return new Response(
    `${text}\n> Incomplete: ${missing.length} of ${pages().length} pages failed to render, so they're missing above. Try again shortly. Missing: ${missing.join(', ')}\n`,
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
