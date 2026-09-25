import type { MetadataRoute } from 'next'
import { source } from '@/lib/source'
import { siteUrl } from '@/lib/site-url'

// typedoc's `_media` README copies are left out, as in llms.txt
const sitemap = (): MetadataRoute.Sitemap =>
  ['/', ...source.getPages().map(page => page.url)]
    .filter(url => !url.includes('_media'))
    .map(url => ({ url: new URL(url, siteUrl).href }))

export default sitemap
