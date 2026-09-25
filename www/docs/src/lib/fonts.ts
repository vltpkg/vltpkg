import { Geist_Mono, Geist_Pixel, Inter } from 'next/font/google'

export const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// display face for moments like the 404; `font-pixel` in tailwind
export const geistPixel = Geist_Pixel({
  variable: '--font-geist-pixel',
  subsets: ['latin'],
  // next has no metrics for this face, so an explicit fallback stops turbopack trying (and warning) to size one
  fallback: ['monospace'],
})
