import { type Props } from '@astrojs/starlight/props'
import config from 'virtual:starlight/user-config'
import ThemeSelect from '@/components/theme-select/theme-select'
import { useStore } from '@/state'

const Footer = (_props: Props) => {
  return (
    <footer className="border-t-[1px]">
      {/* footer links */}
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-x-4 gap-y-4 px-6 py-6">
        <div className="flex w-full flex-row items-center justify-between">
          <FooterSocials />
          <div className="flex items-center gap-2">
            <a
              href="https://www.vlt.sh/join"
              className="group inline-flex items-center gap-3 rounded-[12px] pl-3 pr-1 text-foreground no-underline transition-all">
              <span className="text-15 rounded-[7px] border border-neutral-300 bg-gradient-to-b from-neutral-50 to-neutral-100 px-3 py-1 text-left font-medium group-hover:border-neutral-400 dark:border-neutral-800 dark:from-neutral-900 dark:to-black dark:group-hover:border-neutral-700 dark:group-hover:from-neutral-800/80">
                Join waitlist
              </span>
            </a>
            <ThemeSelect />
          </div>
        </div>

        {/* footer policies */}
        <div className="flex w-full flex-row items-center justify-between">
          <a
            href="https://www.vlt.sh/"
            className="text-sm font-medium text-muted-foreground no-underline transition-all hover:text-foreground">
            &copy; {new Date().getFullYear()} vlt technology inc.
          </a>
          <div className="flex flex-row gap-4">
            <a
              href="https://www.vlt.sh/terms"
              className="text-sm font-medium text-muted-foreground no-underline transition-all hover:text-foreground">
              Terms
            </a>
            <a
              href="https://www.vlt.sh/privacy"
              className="text-sm font-medium text-muted-foreground no-underline transition-all hover:text-foreground">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

const FooterSocials = () => {
  const { getResolvedTheme } = useStore()
  const theme = getResolvedTheme()

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
              filter: theme === 'dark' ? 'invert(0)' : 'invert(1)',
            }}
          />
        </a>
      ))}
    </div>
  )
}

export default Footer
