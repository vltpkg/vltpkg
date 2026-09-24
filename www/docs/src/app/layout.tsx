import type { Metadata } from 'next'
import { Providers } from '@/providers'
import { SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Navbar } from '@/components/navbar'
import { source } from '@/lib/source'
import { inter, geistMono, geistPixel } from '@/lib/fonts'
import { siteUrl } from '@/lib/site-url'
import '@/styles/globals.css'

export const metadata: Metadata = {
  // resolves relative og/twitter image + canonical urls against whichever deployment is serving
  metadataBase: siteUrl,
  openGraph: { siteName: 'vlt docs', type: 'website' },
  title: { default: 'vlt docs', template: '%s — vlt docs' },
  description:
    'Documentation for the vlt client and the vlt registry.',
}

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable} ${geistPixel.variable} h-full antialiased`}
      suppressHydrationWarning>
      <body className="text-body flex min-h-full flex-col">
        <Providers>
          <Navbar />
          <div className="flex flex-1">
            {/* the sidebar is `fixed`, so it's pushed below the navbar explicitly */}
            <AppSidebar
              tree={source.pageTree}
              className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
            />
            <SidebarInset className="px-4 py-8 md:px-16 md:py-12">
              {children}
            </SidebarInset>
          </div>
        </Providers>
      </body>
    </html>
  )
}

export default RootLayout
