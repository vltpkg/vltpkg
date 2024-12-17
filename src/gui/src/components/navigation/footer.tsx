import { useTheme } from '@/components/ui/theme-provider.jsx'
import ThemeSwitcher from '@/components/theme-switcher/theme-switcher.jsx'

interface SocialMediaLink {
  name: string
  to: string
}

const socialMediaLinks: SocialMediaLink[] = [
  {
    name: 'linkedin',
    to: 'https://www.linkedin.com/company/vltpkg/',
  },
  {
    name: 'twitter-x',
    to: 'https://x.com/vltpkg',
  },
  {
    name: 'github',
    to: 'https://github.com/vltpkg',
  },
  {
    name: 'discord',
    to: 'https://discord.gg/vltpkg',
  },
]

export const Footer = () => {
  const { resolvedTheme } = useTheme()

  return (
    <footer className="bg-white dark:bg-black border-t-[1px]">
      <div className="flex flex-col w-full gap-x-4 gap-y-4 px-6 py-6">
        {/* footer links */}
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-4">
            {socialMediaLinks.map((link, idx) => (
              <a href={link.to} key={idx}>
                <img
                  src={`/icons/${link.name}.svg`}
                  className="h-5"
                  style={{
                    filter:
                      resolvedTheme === 'dark' ? 'invert(0)' : (
                        'invert(1)'
                      ),
                  }}
                />
              </a>
            ))}
          </div>
          <div className="flex">
            <ThemeSwitcher />
          </div>
        </div>

        {/* footer policies */}
        <div className="flex flex-row w-full items-center justify-between">
          <a
            href="https://www.vlt.sh/"
            className="no-underline text-sm text-muted-foreground hover:text-foreground transition-all">
            &copy; {new Date().getFullYear()} vlt technology inc.
          </a>
          <div className="flex flex-row gap-4">
            <a
              href="https://www.vlt.sh/terms"
              className="no-underline font-medium text-muted-foreground text-sm hover:text-foreground transition-all">
              Terms
            </a>
            <a
              href="https://www.vlt.sh/privacy"
              className="no-underline font-medium text-muted-foreground text-sm hover:text-foreground transition-all">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
