import path from 'path'
import { createMDX } from 'fumadocs-mdx/next'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  // `/client/auth.md` serves that page as plain markdown
  rewrites: async () => [
    { source: '/:path+.md', destination: '/llms.mdx/:path+' },
  ],
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
