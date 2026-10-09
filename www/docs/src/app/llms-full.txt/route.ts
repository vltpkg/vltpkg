import { pageMarkdown, source } from '@/lib/source'
import { skills } from '@/lib/skills'

// the ~100 typedoc pages would swamp this file; llms.txt still lists them
const pages = source
  .getPages()
  .filter(page => !page.url.startsWith('/client/api-reference'))

// agent skills go last, headed `# Title (url)` like pageMarkdown
const skillTexts = skills.map(({ url, content }) =>
  content.replace(/^# (.+)/, `# $1 (${url})`),
)

export const GET = async () => {
  const texts = await Promise.all(pages.map(pageMarkdown))
  return new Response([...texts, ...skillTexts].join('\n\n'))
}
