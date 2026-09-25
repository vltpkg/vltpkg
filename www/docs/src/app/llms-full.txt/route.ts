import { pageMarkdown, source } from '@/lib/source'

// the ~100 typedoc pages would swamp this file; llms.txt still lists them
const pages = source
  .getPages()
  .filter(page => !page.url.startsWith('/client/api-reference'))

export const GET = async () => {
  const texts = await Promise.all(pages.map(pageMarkdown))
  return new Response(texts.join('\n\n'))
}
