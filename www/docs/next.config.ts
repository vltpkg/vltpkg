import path from 'path'
import { createMDX } from 'fumadocs-mdx/next'

import type { NextConfig } from 'next'

const acceptsMarkdown = {
  type: 'header',
  key: 'accept',
  value: '.*text/markdown.*',
} as const

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  rewrites: async () => ({
    // agents that ask for markdown get it at the page's own url; runs before the filesystem, which would
    // otherwise match the html page first. the path skips the markdown route itself and anything with a
    // file extension (`.md` urls, llms.txt, sitemap.xml, openapi.json), which has no markdown twin
    beforeFiles: [
      {
        source: '/',
        has: [acceptsMarkdown],
        destination: '/llms.mdx',
      },
      {
        source: '/:path((?!llms\\.mdx/)(?!.*\\.[a-z0-9]+$).+)',
        has: [acceptsMarkdown],
        destination: '/llms.mdx/:path',
      },
    ],
    // `/client/auth.md` serves that page as plain markdown
    afterFiles: [
      { source: '/:path+.md', destination: '/llms.mdx/:path+' },
    ],
  }),
  // the old Starlight site's URLs
  redirects: async () => [
    {
      source: '/cli/:path*',
      destination: '/client/:path*',
      permanent: true,
    },
    {
      source: '/get-started/:path*',
      destination: '/:path*',
      permanent: true,
    },
    {
      source: '/packages/:path*',
      destination: '/client/api-reference/:path*',
      permanent: true,
    },
    {
      source: '/migration/:path*',
      destination: '/client/migration/:path*',
      permanent: true,
    },
  ],
  turbopack: {
    root: path.join(__dirname, '../../'),
  },
}

const withMDX = createMDX()

export default withMDX(nextConfig)
