import type { NotFoundMarkdown } from '@affordances/md/next'
import { siteUrl } from '@/lib/site-url'

const abs = (path: string) => new URL(path, siteUrl).href

// a missing page's markdown says where to look instead
export const notFoundMarkdown: NotFoundMarkdown<'/[...slug]'> = ({
  params,
}) =>
  `# 404: Page not found\n\nThere is no page at \`/${params.slug.join('/')}\` on the vlt docs.\n\n- [llms.txt](${abs('/llms.txt')}) lists every page, each available as Markdown\n- [sitemap.xml](${abs('/sitemap.xml')}) lists every URL\n- [Home](${abs('/')})\n`
