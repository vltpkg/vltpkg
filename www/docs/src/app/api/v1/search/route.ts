import { createFromSource } from 'fumadocs-core/search/server'
import type { SortedResult } from 'fumadocs-core/search'
import { source } from '@/lib/source'

const sectionTag = ([section, sub]: string[]) =>
  section === 'client' && sub === 'api-reference' ? 'api-reference'
  : section === 'client' || section === 'registry' ? section
  : undefined

const server = createFromSource(
  // typedoc copies package READMEs into `_media`; they duplicate the package index pages
  {
    ...source,
    getPages: () =>
      source
        .getPages()
        .filter(page => !page.slugs.includes('_media')),
  },
  {
    buildIndex: page => ({
      id: page.url,
      url: page.url,
      title: page.data.title,
      description: page.data.description,
      structuredData: page.data.structuredData,
      tag: sectionTag(page.slugs),
    }),
  },
)

// a page result's content is its highlighted title; typedoc pages otherwise outrank guides on common words
const pageRank = ({ content, url }: SortedResult) =>
  (content.includes('<mark>') ? 0 : 2) +
  (url.startsWith('/client/api-reference/') ? 1 : 0)

export const GET = async (request: Request) => {
  const params = new URL(request.url).searchParams
  const query = params.get('query')
  if (!query) return Response.json([])

  const results = await server.search(query, {
    tag: params.get('tag')?.split(','),
  })
  const groups: SortedResult[][] = []
  for (const result of results) {
    if (result.type === 'page') groups.push([result])
    else groups.at(-1)?.push(result)
  }
  // breadcrumbs start at the page tree root ("Docs"), which is noise in the dialog
  return Response.json(
    groups
      .sort(([a], [b]) => pageRank(a) - pageRank(b))
      .flat()
      .map(result => ({
        ...result,
        breadcrumbs: result.breadcrumbs?.slice(1),
      })),
  )
}
