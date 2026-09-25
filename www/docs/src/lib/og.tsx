import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const ogSize = { width: 1200, height: 630 }

// static Inter from vlt.io; next/og needs ttf/otf/woff, not the woff2 next/font serves
const inter = readFile(join(process.cwd(), 'assets/fonts/inter.ttf'))

// dark by default: the vlt mark top-left, the page title underneath
export const ogImage = async (title: string) =>
  new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 96,
        background: '#000',
        color: '#fafafa',
        fontFamily: 'Inter',
      }}>
      {/* the vlt mark (vlt.io's components/icons/opengraph/vlt.tsx) */}
      <svg width="45" height="40" viewBox="0 0 36 32" fill="none">
        <path
          d="M29.2578 0C32.4894 0 35.1094 2.61997 35.1094 5.85156C35.1092 9.08304 32.4893 11.7021 29.2578 11.7021C28.3255 11.7021 27.368 12.0535 26.9023 12.8612L23.0646 19.5172C22.2315 20.9621 22.6148 22.77 23.1255 24.3577C23.3072 24.9223 23.4053 25.5244 23.4053 26.1494C23.4052 29.3809 20.7852 32.001 17.5537 32.001C14.3223 32.0008 11.7032 29.3808 11.7031 26.1494C11.7031 25.5245 11.8011 24.9224 11.9826 24.3578C12.4928 22.7701 12.8759 20.9622 12.0429 19.5174L8.20462 12.8604C7.73918 12.0531 6.7824 11.7021 5.85059 11.7021C2.61927 11.7019 0.000134262 9.0829 0 5.85156C0 2.62011 2.61919 0.000226808 5.85059 0C9.08218 0 11.7021 2.61997 11.7021 5.85156C11.7021 6.47606 11.6041 7.07754 11.4227 7.64163C10.9123 9.22914 10.5293 11.0366 11.3623 12.4812L15.2026 19.1405C15.6675 19.9467 16.6231 20.2979 17.5537 20.2979C18.4844 20.2979 19.4399 19.9467 19.9048 19.1405L23.7454 12.4807C24.5783 11.0364 24.1957 9.22907 23.6855 7.64171C23.5042 7.07753 23.4063 6.476 23.4062 5.85156C23.4062 2.62 26.0263 5.23144e-05 29.2578 0Z"
          fill="#fafafa"
        />
      </svg>
      <div
        style={{
          display: 'flex',
          fontSize: 80,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
        }}>
        {title}
      </div>
    </div>,
    {
      ...ogSize,
      fonts: [{ name: 'Inter', data: await inter, style: 'normal' }],
    },
  )
