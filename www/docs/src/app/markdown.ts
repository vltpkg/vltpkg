import type { Markdown } from '@affordances/md/next'
import { GET as llmsTxt } from '@/app/llms.txt/route'

// the homepage is cards and links, so its markdown is the llms.txt index
const markdown: Markdown<'/'> = async ({ request }) =>
  (await llmsTxt(request)).text()

export default markdown
