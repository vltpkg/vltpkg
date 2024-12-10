import { type Props } from '@astrojs/starlight/props'
import config from 'virtual:starlight/user-config'
import ThemeSelect from '../theme-select/theme-select'
import { useState } from 'react'
import type { Theme } from '../theme-select/theme-select'
import { getPreferredColorScheme } from '../theme-select/theme-select'

const Footer = (_props: Props) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(
    getPreferredColorScheme(),
  )

  return (
    <footer className="border-t-[1px]">
      {/* footer links */}
      <div className="mx-auto flex flex-col w-full max-w-screen-xl gap-x-4 gap-y-4 px-6 py-6">
        <div className="flex flex-row w-full items-center justify-between">
          <Footer.Socials currentTheme={currentTheme} />
          <div className="flex items-center gap-2">
            <a
              href="https://www.vlt.sh/join"
              className="no-underline text-foreground pl-3 pr-1 inline-flex gap-3 items-center rounded-[12px] group transition-all">
              <span className="text-left bg-gradient-to-b from-neutral-50 to-neutral-100 dark:to-black dark:from-neutral-900 dark:group-hover:from-neutral-800/80 rounded-[7px] border border-neutral-300 group-hover:border-neutral-400 dark:border-neutral-800 dark:group-hover:border-neutral-700 px-3 py-1 text-15 font-medium">
                Join waitlist
              </span>
            </a>
            <ThemeSelect setCurrentTheme={setCurrentTheme} />
          </div>
        </div>

        {/* footer policies */}
        <div className="flex flex-row w-full items-center justify-between">
          <a
            href="https://www.vlt.sh/"
            className="no-underline text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
            &copy; {new Date().getFullYear()} vlt technology inc.
          </a>
          <div className="flex flex-row gap-4">
            <a
              href="https://www.vlt.sh/terms"
              className="no-underline text-muted-foreground text-sm font-medium hover:text-foreground transition-all">
              Terms
            </a>
            <a
              href="https://www.vlt.sh/privacy"
              className="no-underline text-muted-foreground text-sm font-medium hover:text-foreground transition-all">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

Footer.Socials = ({ currentTheme }: { currentTheme: Theme }) => {
  const socialLinks = Object.entries(config.social ?? {}).map(
    ([platform, value]) => ({
      platform,
      ...value,
    }),
  )

  return (
    <div className="flex gap-4">
      {socialLinks.map((link, idx) => (
        <a href={link.url} key={idx}>
          <img
            src={`/icons/${link.platform}.svg`}
            className="h-5"
            style={{
              filter:
                currentTheme === 'dark' ? 'invert(0)'
                : currentTheme === 'light' ? 'invert(1)'
                : '',
            }}
          />
        </a>
      ))}
    </div>
  )
}

export default Footer
